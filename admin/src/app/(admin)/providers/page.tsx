"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, Radio, SlidersHorizontal, Store, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, initials, locationLabel } from "@/lib/format";
import { accountStatusBadge, accountStatusLabel } from "@/lib/status";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { TablePageSkeleton } from "@/components/ui/Skeleton";
import { ProviderDetailPanel, type ProviderRow } from "./ProviderDetailPanel";

type CoverageRow = {
  business_id: string;
  pincode: string;
  locality_id: string | null;
  area_id: string | null;
  localities: { name: string } | null;
  areas: { name: string } | null;
};

type InterestLite = {
  business_id: string;
  status: string;
  jobs: { status: string; closed_with_business_id: string | null } | null;
};

type LiveLite = {
  business_id: string;
  is_active: boolean;
  is_deleted: boolean;
};

const EMPTY_FILTERS = {
  search: "",
  status: "all",
  live: "all",
  pincode: "",
};

function coverageLabel(items: CoverageRow[]) {
  const pins = [...new Set(items.map((i) => i.pincode))];
  return pins
    .map((pin) => {
      const pinRows = items.filter((i) => i.pincode === pin);
      if (pinRows.some((i) => !i.locality_id && !i.area_id)) return `${pin} (all)`;
      const bits = pinRows.map((i) => i.areas?.name || i.localities?.name).filter(Boolean);
      return bits.length ? `${pin}: ${bits.join(", ")}` : pin;
    })
    .join(" · ");
}

export default function ProvidersPage() {
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [live, setLive] = useState("all");
  const [pincode, setPincode] = useState("");
  const [selected, setSelected] = useState<ProviderRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [bizRes, coverageRes, interestsRes, dealsRes, liveRes] = await Promise.all([
      supabase
        .from("businesses")
        .select(
          "id, owner_id, name, is_active, is_deleted, created_at, categories(name, slug), profiles(id, phone, email, full_name, pincode, locality, area)",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("business_service_areas")
        .select("business_id, pincode, locality_id, area_id, localities(name), areas(name)")
        .eq("is_deleted", false),
      supabase.from("job_interests").select("business_id, status, jobs(status, closed_with_business_id)").limit(5000),
      supabase.from("jobs").select("closed_with_business_id").not("closed_with_business_id", "is", null).limit(5000),
      supabase.from("live_sessions").select("business_id, is_active, is_deleted").limit(2000),
    ]);

    const coverageByBiz = new Map<string, CoverageRow[]>();
    for (const row of (coverageRes.data as unknown as CoverageRow[] | null) ?? []) {
      const cur = coverageByBiz.get(row.business_id) ?? [];
      cur.push(row);
      coverageByBiz.set(row.business_id, cur);
    }

    const interestCounts = new Map<string, { interests: number; waiting: number }>();
    for (const row of (interestsRes.data as unknown as InterestLite[] | null) ?? []) {
      const cur = interestCounts.get(row.business_id) ?? { interests: 0, waiting: 0 };
      cur.interests += 1;
      if (row.status === "waiting" && row.jobs?.status !== "closed") cur.waiting += 1;
      interestCounts.set(row.business_id, cur);
    }

    const closedCounts = new Map<string, number>();
    for (const row of (dealsRes.data as { closed_with_business_id: string | null }[] | null) ?? []) {
      if (!row.closed_with_business_id) continue;
      closedCounts.set(row.closed_with_business_id, (closedCounts.get(row.closed_with_business_id) ?? 0) + 1);
    }

    const liveNow = new Set(
      ((liveRes.data as LiveLite[] | null) ?? [])
        .filter((s) => s.is_active && !s.is_deleted)
        .map((s) => s.business_id),
    );

    const list: ProviderRow[] = ((bizRes.data as unknown as Omit<
      ProviderRow,
      "coverage" | "interests" | "waiting" | "closedDeals" | "liveNow"
    >[]) ?? []).map((b) => {
      const counts = interestCounts.get(b.id) ?? { interests: 0, waiting: 0 };
      return {
        ...b,
        coverage: coverageLabel(coverageByBiz.get(b.id) ?? []),
        interests: counts.interests,
        waiting: counts.waiting,
        closedDeals: closedCounts.get(b.id) ?? 0,
        liveNow: liveNow.has(b.id),
      };
    });

    setRows(list);
    setSelected((cur) => (cur ? (list.find((r) => r.id === cur.id) ?? null) : null));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeFilterCount = [
    search.trim() ? 1 : 0,
    status !== "all" ? 1 : 0,
    live !== "all" ? 1 : 0,
    pincode.trim() ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setSearch(EMPTY_FILTERS.search);
    setStatus(EMPTY_FILTERS.status);
    setLive(EMPTY_FILTERS.live);
    setPincode(EMPTY_FILTERS.pincode);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pin = pincode.trim();
    return rows.filter((r) => {
      if (status === "active" && !(r.is_active && !r.is_deleted)) return false;
      if (status === "inactive" && !(!r.is_active && !r.is_deleted)) return false;
      if (status === "deleted" && !r.is_deleted) return false;
      if (live === "live" && !r.liveNow) return false;
      if (live === "offline" && r.liveNow) return false;
      if (pin && r.profiles?.pincode !== pin && !r.coverage.includes(pin)) return false;
      if (q) {
        const hay = `${r.name} ${r.profiles?.full_name ?? ""} ${r.profiles?.phone ?? ""} ${r.profiles?.email ?? ""} ${r.categories?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, status, live, pincode]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.is_active && !r.is_deleted).length;
    const inactive = rows.filter((r) => !r.is_active && !r.is_deleted).length;
    const deleted = rows.filter((r) => r.is_deleted).length;
    const liveNow = rows.filter((r) => r.liveNow).length;
    const closedDeals = rows.reduce((sum, r) => sum + r.closedDeals, 0);
    const interests = rows.reduce((sum, r) => sum + r.interests, 0);
    const waiting = rows.reduce((sum, r) => sum + r.waiting, 0);
    return { total, active, inactive, deleted, liveNow, closedDeals, interests, waiting };
  }, [rows]);

  const closePanel = useCallback(() => setSelected(null), []);

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        title="Providers management"
        action={
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="btn-secondary inline-flex w-auto items-center gap-2 py-2.5"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-soft px-1.5 text-[11px] font-bold text-blue-deep">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        }
      />

      {filtersOpen ? (
        <div className="mt-4">
          <FilterBar>
            <FilterField label="Search" className="min-w-[200px] flex-[2]">
              <FilterInput
                value={search}
                onChange={setSearch}
                placeholder="Business, owner, phone, or category"
              />
            </FilterField>
            <FilterField label="Status">
              <FilterSelect value={status} onChange={setStatus}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deleted">Deleted</option>
              </FilterSelect>
            </FilterField>
            <FilterField label="Live">
              <FilterSelect value={live} onChange={setLive}>
                <option value="all">All</option>
                <option value="live">Live now</option>
                <option value="offline">Not live</option>
              </FilterSelect>
            </FilterField>
            <FilterField label="Pincode">
              <FilterInput value={pincode} onChange={setPincode} placeholder="Owner or coverage" />
            </FilterField>
            {activeFilterCount > 0 ? (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-[46px] text-sm font-bold text-blue-deep hover:underline"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </FilterBar>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total providers" value={stats.total} icon={Store} tone="indigo" />
        <StatCard
          label="Active"
          value={stats.active}
          hint={`${stats.inactive} inactive · ${stats.deleted} deleted`}
          icon={UserCheck}
          tone="green"
        />
        <StatCard label="Live now" value={stats.liveNow} icon={Radio} tone="teal" />
        <StatCard
          label="Closed jobs"
          value={stats.closedDeals}
          hint={`${stats.interests} interests · ${stats.waiting} waiting`}
          icon={Briefcase}
          tone="amber"
        />
      </div>

      <div className="mt-4">
        <DataTable
          rows={filtered}
          selectedId={selected?.id}
          emptyMessage="No providers match your filters."
          onRowClick={setSelected}
          defaultSortKey="joined"
          defaultSortDir="desc"
          columns={[
            {
              key: "business",
              header: "Business",
              sortValue: (row) => row.name,
              render: (row) => (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-soft text-xs font-bold text-indigo">
                    {initials(row.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-xs text-ink-soft">{row.categories?.name ?? "—"}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "owner",
              header: "Owner",
              sortValue: (row) => row.profiles?.full_name || row.profiles?.phone || "",
              render: (row) => (
                <div>
                  <p className="font-medium">{row.profiles?.full_name || "—"}</p>
                  <p className="text-xs text-ink-soft">{row.profiles?.phone ?? "—"}</p>
                </div>
              ),
            },
            {
              key: "location",
              header: "Location",
              sortValue: (row) => locationLabel(row.profiles?.pincode ?? null, row.profiles?.locality ?? null),
              render: (row) => (
                <span className="text-ink-soft">
                  {locationLabel(row.profiles?.pincode ?? null, row.profiles?.locality ?? null, row.profiles?.area)}
                </span>
              ),
            },
            {
              key: "activity",
              header: "Activity",
              sortValue: (row) => row.closedDeals * 1000 + row.interests,
              render: (row) => (
                <div>
                  <p className="text-ink-soft">
                    {row.interests} interested · {row.closedDeals} closed
                  </p>
                  {row.waiting > 0 ? (
                    <p className="text-xs text-ink-faint">{row.waiting} waiting</p>
                  ) : null}
                  {row.liveNow ? (
                    <Badge className="mt-1 bg-teal-soft text-teal">Live now</Badge>
                  ) : (
                    <p className="text-xs text-ink-faint">Not live</p>
                  )}
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              sortValue: (row) => (row.is_deleted ? 2 : row.is_active ? 0 : 1),
              render: (row) => (
                <Badge className={accountStatusBadge(row.is_active, row.is_deleted)}>
                  {accountStatusLabel(row.is_active, row.is_deleted)}
                </Badge>
              ),
            },
            {
              key: "joined",
              header: "Listed",
              sortValue: (row) => row.created_at,
              render: (row) => (
                <span className="text-ink-soft">{formatDateTime(row.created_at)}</span>
              ),
            },
          ]}
        />
      </div>

      {selected ? (
        <ProviderDetailPanel key={selected.id} provider={selected} onClose={closePanel} />
      ) : null}
    </div>
  );
}
