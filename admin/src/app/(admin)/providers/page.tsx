"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Radio, RotateCcw, SlidersHorizontal, Store, Trash2, UserCheck, Tags } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, initials, locationLabel } from "@/lib/format";
import { accountStatusBadge, accountStatusLabel } from "@/lib/status";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { TablePageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { ProviderDetailPanel, type ProviderRow } from "./ProviderDetailPanel";
import { ProviderFormModal, type ProviderFormValues } from "./ProviderFormModal";
import { ChangeCategoryModal } from "@/components/ChangeCategoryModal";

type CoverageRow = {
  business_id: string;
  pincode: string;
  locality_id: string | null;
  area_id: string | null;
  localities: { name: string } | null;
  areas: { name: string } | null;
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
  category: "all",
};

const OTHER_FILTER = "__other__";

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

function statusOf(row: ProviderRow): ProviderFormValues["status"] {
  if (row.is_deleted) return "deleted";
  if (!row.is_active) return "inactive";
  return "active";
}

function formFromProvider(row: ProviderRow): ProviderFormValues {
  return {
    name: row.name,
    category_id: row.category_id,
    photo_url: row.photo_url ?? "",
    status: statusOf(row),
  };
}

async function readError(res: Response) {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error || `Request failed (${res.status})`;
}

export default function ProvidersPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [live, setLive] = useState("all");
  const [pincode, setPincode] = useState("");
  const [category, setCategory] = useState("all");
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string; is_other: boolean }>>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeSaving, setChangeSaving] = useState(false);
  const [changeError, setChangeError] = useState("");
  const [selected, setSelected] = useState<ProviderRow | null>(null);
  const [editing, setEditing] = useState<ProviderRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [bizRes, coverageRes, liveRes, catRes] = await Promise.all([
      supabase
        .from("businesses")
        .select(
          "id, owner_id, name, photo_url, category_id, is_active, is_deleted, created_at, categories(name, slug, is_other), profiles(id, phone, email, full_name, pincode, locality, area)",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("business_service_areas")
        .select("business_id, pincode, locality_id, area_id, localities(name), areas(name)")
        .eq("is_deleted", false),
      supabase.from("live_sessions").select("business_id, is_active, is_deleted").limit(2000),
      supabase.from("categories").select("id, name, is_other").eq("is_deleted", false).order("name"),
    ]);

    const coverageByBiz = new Map<string, CoverageRow[]>();
    for (const row of (coverageRes.data as unknown as CoverageRow[] | null) ?? []) {
      const cur = coverageByBiz.get(row.business_id) ?? [];
      cur.push(row);
      coverageByBiz.set(row.business_id, cur);
    }

    const liveNow = new Set(
      ((liveRes.data as LiveLite[] | null) ?? [])
        .filter((s) => s.is_active && !s.is_deleted)
        .map((s) => s.business_id),
    );

    const list: ProviderRow[] = ((bizRes.data as unknown as Omit<
      ProviderRow,
      "coverage" | "liveNow"
    >[]) ?? []).map((b) => {
      return {
        ...b,
        coverage: coverageLabel(coverageByBiz.get(b.id) ?? []),
        liveNow: liveNow.has(b.id),
      };
    });

    setRows(list);
    setCategoryOptions((catRes.data as Array<{ id: string; name: string; is_other: boolean }> | null) ?? []);
    setSelected((cur) => (cur ? (list.find((r) => r.id === cur.id) ?? null) : null));
    setSelectedIds((cur) => {
      const ids = new Set(list.map((r) => r.id));
      return new Set([...cur].filter((id) => ids.has(id)));
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    const kind = params.get("kind");
    if (cat) {
      setCategory(cat);
      setFiltersOpen(true);
    } else if (kind === "other") {
      setCategory(OTHER_FILTER);
      setFiltersOpen(true);
    }
    void load();
  }, [load]);

  const activeFilterCount = [
    search.trim() ? 1 : 0,
    status !== "all" ? 1 : 0,
    live !== "all" ? 1 : 0,
    pincode.trim() ? 1 : 0,
    category !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setSearch(EMPTY_FILTERS.search);
    setStatus(EMPTY_FILTERS.status);
    setLive(EMPTY_FILTERS.live);
    setPincode(EMPTY_FILTERS.pincode);
    setCategory(EMPTY_FILTERS.category);
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
      if (category === OTHER_FILTER && !r.categories?.is_other) return false;
      if (category !== "all" && category !== OTHER_FILTER && r.category_id !== category) return false;
      if (q) {
        const hay = `${r.name} ${r.profiles?.full_name ?? ""} ${r.profiles?.phone ?? ""} ${r.profiles?.email ?? ""} ${r.categories?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, status, live, pincode, category]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.is_active && !r.is_deleted).length;
    const inactive = rows.filter((r) => !r.is_active && !r.is_deleted).length;
    const deleted = rows.filter((r) => r.is_deleted).length;
    const liveNow = rows.filter((r) => r.liveNow).length;
    return { total, active, inactive, deleted, liveNow };
  }, [rows]);

  const closePanel = useCallback(() => setSelected(null), []);

  const openEdit = (row: ProviderRow) => {
    setFormError("");
    setEditing(row);
  };

  const submitForm = async (values: ProviderFormValues) => {
    if (!editing) return;
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch(`/api/businesses/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(await readError(res));
      showToast("Business updated");
      setEditing(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save business");
    } finally {
      setSaving(false);
    }
  };

  const deleteBusiness = async (row: ProviderRow) => {
    const ok = await confirm({
      title: "Delete business?",
      message: `Neighbours will no longer see ${row.name}. The owner account stays active, and you can restore this listing later.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/businesses/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast(await readError(res));
      return;
    }
    showToast("Business deleted");
    setSelected(null);
    await load();
  };

  const restoreBusiness = async (row: ProviderRow) => {
    const ok = await confirm({
      title: "Restore business?",
      message: `Restore ${row.name} so neighbours can find this listing again.`,
      confirmLabel: "Restore",
    });
    if (!ok) return;
    const res = await fetch(`/api/businesses/${row.id}/restore`, { method: "POST" });
    if (!res.ok) {
      showToast(await readError(res));
      return;
    }
    showToast("Business restored");
    await load();
  };

  const recategorize = async (categoryId: string) => {
    const ids = filtered.filter((r) => selectedIds.has(r.id)).map((r) => r.id);
    if (!ids.length) {
      setChangeError("Select at least one business");
      return;
    }
    setChangeSaving(true);
    setChangeError("");
    try {
      const res = await fetch("/api/businesses/recategorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, category_id: categoryId }),
      });
      if (!res.ok) throw new Error(await readError(res));
      showToast(`Updated ${ids.length} ${ids.length === 1 ? "business" : "businesses"}`);
      setChangeOpen(false);
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      setChangeError(e instanceof Error ? e.message : "Could not update category");
    } finally {
      setChangeSaving(false);
    }
  };

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        title="Providers management"
        action={
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setChangeError("");
                  setChangeOpen(true);
                }}
                className="btn-secondary inline-flex w-auto items-center gap-2 py-2.5"
              >
                <Tags size={16} />
                Change category ({selectedIds.size})
              </button>
            ) : null}
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
          </div>
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
            <FilterField label="Category" className="min-w-[180px]">
              <FilterSelect value={category} onChange={setCategory}>
                <option value="all">All</option>
                <option value={OTHER_FILTER}>Other (pending)</option>
                {categoryOptions
                  .filter((c) => !c.is_other)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </FilterSelect>
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
      </div>

      <div className="mt-4">
        <DataTable
          rows={filtered}
          selectedId={selected?.id}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
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
                    <p className="text-xs text-ink-soft">
                      {row.categories?.name ?? "—"}
                      {row.categories?.is_other ? " · Other" : ""}
                    </p>
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
              sortValue: (row) => (row.liveNow ? 1 : 0),
              render: (row) =>
                row.liveNow ? (
                  <Badge className="bg-teal-soft text-teal">Live now</Badge>
                ) : (
                  <span className="text-xs text-ink-faint">Not live</span>
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
            {
              key: "actions",
              header: "Actions",
              className: "w-28",
              render: (row) => (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => openEdit(row)}
                    className="rounded-[10px] border border-line p-2 hover:bg-surface"
                  >
                    <Pencil size={14} />
                  </button>
                  {row.is_deleted ? (
                    <button
                      type="button"
                      title="Restore"
                      onClick={() => void restoreBusiness(row)}
                      className="rounded-[10px] border border-line p-2 hover:bg-surface"
                    >
                      <RotateCcw size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => void deleteBusiness(row)}
                      className="rounded-[10px] border border-line p-2 text-rose hover:bg-rose-soft"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {selected ? (
        <ProviderDetailPanel
          key={`detail-${selected.id}`}
          provider={selected}
          onClose={closePanel}
          onEdit={() => openEdit(selected)}
          onDelete={() => void deleteBusiness(selected)}
          onRestore={() => void restoreBusiness(selected)}
        />
      ) : null}

      {editing ? (
        <ProviderFormModal
          key={`form-${editing.id}`}
          initial={formFromProvider(editing)}
          saving={saving}
          error={formError}
          onClose={() => setEditing(null)}
          onSubmit={(values) => void submitForm(values)}
        />
      ) : null}

      {changeOpen ? (
        <ChangeCategoryModal
          count={selectedIds.size}
          saving={changeSaving}
          error={changeError}
          onClose={() => setChangeOpen(false)}
          onSubmit={(id) => void recategorize(id)}
        />
      ) : null}
    </div>
  );
}
