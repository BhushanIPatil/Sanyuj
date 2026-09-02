"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, initials, locationLabel } from "@/lib/format";
import { accountStatusBadge, accountStatusLabel } from "@/lib/status";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/ui/FilterBar";
import { TablePageSkeleton } from "@/components/ui/Skeleton";

type CoverageRow = {
  business_id: string;
  pincode: string;
  locality_id: string | null;
  area_id: string | null;
  localities: { name: string } | null;
  areas: { name: string } | null;
};

type ProviderRow = {
  id: string;
  name: string;
  rating: number;
  jobs_done: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  categories: { name: string; slug: string } | null;
  profiles: {
    id: string;
    phone: string;
    full_name: string | null;
    pincode: string | null;
    locality: string | null;
  } | null;
};

export default function ProvidersPage() {
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [coverage, setCoverage] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pincode, setPincode] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      let query = supabase
        .from("businesses")
        .select(
          "id, name, rating, jobs_done, is_active, is_deleted, created_at, categories(name, slug), profiles(id, phone, full_name, pincode, locality)",
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (status === "active") query = query.eq("is_active", true).eq("is_deleted", false);
      if (status === "inactive") query = query.eq("is_active", false).eq("is_deleted", false);
      if (status === "deleted") query = query.eq("is_deleted", true);

      const { data } = await query;
      let list = (data as unknown as ProviderRow[]) ?? [];

      if (pincode.trim()) {
        list = list.filter((r) => r.profiles?.pincode === pincode.trim());
      }

      const ids = list.map((r) => r.id);
      const labels: Record<string, string> = {};
      if (ids.length) {
        const { data: bsa } = await supabase
          .from("business_service_areas")
          .select("business_id, pincode, locality_id, area_id, localities(name), areas(name)")
          .in("business_id", ids)
          .eq("is_deleted", false);
        const grouped = new Map<string, CoverageRow[]>();
        for (const row of (bsa as unknown as CoverageRow[] | null) ?? []) {
          const cur = grouped.get(row.business_id) ?? [];
          cur.push(row);
          grouped.set(row.business_id, cur);
        }
        for (const [id, items] of grouped) {
          const pins = [...new Set(items.map((i) => i.pincode))];
          labels[id] = pins
            .map((pin) => {
              const pinRows = items.filter((i) => i.pincode === pin);
              if (pinRows.some((i) => !i.locality_id && !i.area_id)) return `${pin} (all)`;
              const bits = pinRows.map((i) => i.areas?.name || i.localities?.name).filter(Boolean);
              return bits.length ? `${pin}: ${bits.join(", ")}` : pin;
            })
            .join(" · ");
        }
      }

      setCoverage(labels);
      setRows(list);
      setLoading(false);
    };
    void load();
  }, [status, pincode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.profiles?.full_name?.toLowerCase().includes(q) ?? false) ||
        (r.profiles?.phone.toLowerCase().includes(q) ?? false),
    );
  }, [rows, search]);

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Businesses"
        title="Providers"
        description={`${filtered.length} provider account${filtered.length === 1 ? "" : "s"}`}
      />

      <div className="mt-6">
        <FilterBar>
          <FilterField label="Search" className="min-w-[200px] flex-[2]">
            <FilterInput
              value={search}
              onChange={setSearch}
              placeholder="Business, owner name, or phone"
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
          <FilterField label="Owner pincode">
            <FilterInput value={pincode} onChange={setPincode} placeholder="e.g. 425001" />
          </FilterField>
        </FilterBar>
      </div>

      <div className="mt-4">
        <DataTable
          rows={filtered}
          emptyMessage="No providers match your filters."
          columns={[
            {
              key: "business",
              header: "Business",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-soft text-xs font-bold text-indigo">
                    {initials(row.name)}
                  </span>
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-xs text-ink-soft">
                      {row.categories?.name ?? "—"}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: "owner",
              header: "Owner",
              render: (row) => (
                <div>
                  <p className="font-medium">{row.profiles?.full_name || "—"}</p>
                  <p className="text-xs text-ink-soft">{row.profiles?.phone ?? "—"}</p>
                </div>
              ),
            },
            {
              key: "location",
              header: "Owner location",
              render: (row) => (
                <span className="text-ink-soft">
                  {locationLabel(row.profiles?.pincode ?? null, row.profiles?.locality ?? null)}
                </span>
              ),
            },
            {
              key: "coverage",
              header: "Service areas",
              render: (row) => (
                <span className="text-xs text-ink-soft">{coverage[row.id] || "—"}</span>
              ),
            },
            {
              key: "stats",
              header: "Stats",
              render: (row) => (
                <span className="text-ink-soft">
                  {row.jobs_done} jobs · {Number(row.rating).toFixed(1)}★
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <Badge className={accountStatusBadge(row.is_active, row.is_deleted)}>
                  {accountStatusLabel(row.is_active, row.is_deleted)}
                </Badge>
              ),
            },
            {
              key: "joined",
              header: "Listed",
              render: (row) => (
                <span className="text-ink-soft">{formatDateTime(row.created_at)}</span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
