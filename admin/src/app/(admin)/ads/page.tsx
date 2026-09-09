"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Megaphone,
  MousePointerClick,
  Pencil,
  Plus,
  Radio,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ImageOrEmoji, ImagePreview } from "@/components/ui/ImageOrEmoji";
import { TablePageSkeleton } from "@/components/ui/Skeleton";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { AdCoverageEditor } from "@/components/AdCoverageEditor";
import {
  fetchAdCoverage,
  groupAdCoverage,
  saveAdCoverage,
  summarizeAdPin,
  type AdPinDraft,
} from "@/lib/geo/adCoverage";
import {
  AdDetailPanel,
  adRunState,
  adRunStateBadge,
  adRunStateLabel,
  paymentBadge,
  type AdPaymentStatus,
  type AdRow,
} from "./AdDetailPanel";

type AdForm = {
  brand_name: string;
  title: string;
  body: string;
  cta_label: string;
  cta_url: string;
  image_url: string;
  background: string;
  sort_order: number;
  is_active: boolean;
  is_deleted: boolean;
  starts_at: string | null;
  ends_at: string | null;
  offer_starts_at: string | null;
  offer_ends_at: string | null;
  price: string;
  payment_status: AdPaymentStatus;
  is_home_screen: boolean;
};

const EMPTY_FILTERS = {
  search: "",
  status: "all",
  payment: "all",
  coverage: "all",
  placement: "all",
};

const EMPTY_AD: AdForm = {
  brand_name: "",
  title: "",
  body: "",
  cta_label: "",
  cta_url: "",
  image_url: "",
  background: "linear-gradient(135deg,#2E86D6,#3B5BDB)",
  sort_order: 0,
  is_active: true,
  is_deleted: false,
  starts_at: null,
  ends_at: null,
  offer_starts_at: null,
  offer_ends_at: null,
  price: "",
  payment_status: "unpaid",
  is_home_screen: true,
};

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formFromAd(ad: AdRow): AdForm {
  return {
    brand_name: ad.brand_name,
    title: ad.title,
    body: ad.body ?? "",
    cta_label: ad.cta_label ?? "",
    cta_url: ad.cta_url ?? "",
    image_url: ad.image_url ?? "",
    background: ad.background,
    sort_order: ad.sort_order,
    is_active: ad.is_active,
    is_deleted: ad.is_deleted,
    starts_at: ad.starts_at,
    ends_at: ad.ends_at,
    offer_starts_at: ad.offer_starts_at,
    offer_ends_at: ad.offer_ends_at,
    price: ad.price != null ? String(ad.price) : "",
    payment_status: ad.payment_status,
    is_home_screen: ad.is_home_screen,
  };
}

function parsePrice(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export default function AdsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [coverage, setCoverage] = useState("all");
  const [placement, setPlacement] = useState("all");
  const [selected, setSelected] = useState<AdRow | null>(null);
  const [editing, setEditing] = useState<AdRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_AD);
  const [nationwide, setNationwide] = useState(true);
  const [pins, setPins] = useState<AdPinDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("ads").select("*").order("sort_order", { ascending: true });
    if (error) {
      showToast(error.message);
      setLoading(false);
      return;
    }

    const list = (data as Array<Omit<AdRow, "coverage" | "totalClicks" | "uniqueUsers">>) ?? [];
    const ids = list.map((a) => a.id);
    const labels: Record<string, string> = {};
    const stats: Record<string, { totalClicks: number; uniqueUsers: number }> = {};

    if (ids.length) {
      const { data: asa } = await supabase
        .from("ad_service_areas")
        .select("ad_id, pincode, locality_id, area_id, localities(name), areas(name)")
        .in("ad_id", ids)
        .eq("is_deleted", false);
      const raw =
        (asa as Array<{
          ad_id: string;
          pincode: string;
          locality_id: string | null;
          area_id: string | null;
          localities: { name: string } | null;
          areas: { name: string } | null;
        }> | null) ?? [];
      const byAd = new Map<string, typeof raw>();
      for (const row of raw) {
        const cur = byAd.get(row.ad_id) ?? [];
        cur.push(row);
        byAd.set(row.ad_id, cur);
      }
      for (const ad of list) {
        const rowsForAd = byAd.get(ad.id) ?? [];
        if (!rowsForAd.length) {
          labels[ad.id] = "Everywhere";
          continue;
        }
        const drafts = groupAdCoverage(
          rowsForAd.map((r) => ({
            id: r.ad_id,
            ad_id: r.ad_id,
            pincode: r.pincode,
            locality_id: r.locality_id,
            area_id: r.area_id,
            localities: r.localities ? { id: "", name: r.localities.name } : null,
            areas: r.areas ? { id: "", name: r.areas.name } : null,
          })),
        );
        labels[ad.id] = drafts.map((p) => `${p.pincode} (${summarizeAdPin(p)})`).join(" · ");
      }

      const { data: clickRows } = await supabase
        .from("ad_user_clicks")
        .select("ad_id, count, user_id")
        .in("ad_id", ids);
      for (const row of (clickRows as Array<{ ad_id: string; count: number; user_id: string }> | null) ?? []) {
        const cur = stats[row.ad_id] ?? { totalClicks: 0, uniqueUsers: 0 };
        cur.totalClicks += row.count;
        cur.uniqueUsers += 1;
        stats[row.ad_id] = cur;
      }
    }

    const mapped: AdRow[] = list.map((ad) => ({
      ...ad,
      price: typeof ad.price === "number" ? ad.price : null,
      payment_status: ad.payment_status === "paid" ? "paid" : "unpaid",
      is_home_screen: ad.is_home_screen !== false,
      coverage: labels[ad.id] || "Everywhere",
      totalClicks: stats[ad.id]?.totalClicks ?? 0,
      uniqueUsers: stats[ad.id]?.uniqueUsers ?? 0,
    }));

    setRows(mapped);
    setSelected((cur) => (cur ? (mapped.find((r) => r.id === cur.id) ?? null) : null));
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeFilterCount = [
    search.trim() ? 1 : 0,
    status !== "all" ? 1 : 0,
    payment !== "all" ? 1 : 0,
    coverage !== "all" ? 1 : 0,
    placement !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setSearch(EMPTY_FILTERS.search);
    setStatus(EMPTY_FILTERS.status);
    setPayment(EMPTY_FILTERS.payment);
    setCoverage(EMPTY_FILTERS.coverage);
    setPlacement(EMPTY_FILTERS.placement);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const run = adRunState(r);
      if (status !== "all" && run !== status) return false;
      if (payment !== "all" && r.payment_status !== payment) return false;
      if (coverage === "everywhere" && r.coverage !== "Everywhere") return false;
      if (coverage === "targeted" && r.coverage === "Everywhere") return false;
      if (placement === "home" && !r.is_home_screen) return false;
      if (placement === "offerly" && r.is_home_screen) return false;
      if (q) {
        const hay = `${r.brand_name} ${r.title} ${r.body ?? ""} ${r.cta_label ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, status, payment, coverage, placement]);

  const pageStats = useMemo(() => {
    const total = rows.length;
    const deleted = rows.filter((r) => r.is_deleted).length;
    const live = rows.filter((r) => adRunState(r) === "live").length;
    const scheduled = rows.filter((r) => adRunState(r) === "scheduled").length;
    const ended = rows.filter((r) => adRunState(r) === "ended").length;
    const clicks = rows.reduce((sum, r) => sum + r.totalClicks, 0);
    const unique = rows.reduce((sum, r) => sum + r.uniqueUsers, 0);
    const paid = rows.filter((r) => r.payment_status === "paid" && !r.is_deleted);
    const unpaid = rows.filter((r) => r.payment_status === "unpaid" && !r.is_deleted);
    const paidAmount = paid.reduce((sum, r) => sum + (r.price ?? 0), 0);
    const unpaidAmount = unpaid.reduce((sum, r) => sum + (r.price ?? 0), 0);
    return {
      total,
      deleted,
      live,
      scheduled,
      ended,
      clicks,
      unique,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      paidAmount,
      unpaidAmount,
    };
  }, [rows]);

  const closePanel = useCallback(() => setSelected(null), []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_AD);
    setNationwide(true);
    setPins([]);
    setCreating(true);
  };

  const openEdit = async (ad: AdRow) => {
    setCreating(false);
    setEditing(ad);
    setForm(formFromAd(ad));
    const supabase = createClient();
    const rowsForAd = await fetchAdCoverage(supabase, ad.id);
    const drafts = groupAdCoverage(rowsForAd);
    setPins(drafts);
    setNationwide(drafts.length === 0);
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (!form.brand_name.trim() || !form.title.trim()) {
      showToast("Brand name and title are required");
      return;
    }
    if (form.price.trim() && parsePrice(form.price) == null) {
      showToast("Enter a valid price of 0 or more");
      return;
    }
    if (!nationwide && pins.length === 0) {
      showToast("Add at least one pincode, or show everywhere");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      brand_name: form.brand_name.trim(),
      title: form.title.trim(),
      body: form.body?.trim() || null,
      cta_label: form.cta_label?.trim() || null,
      cta_url: form.cta_url?.trim() || null,
      image_url: form.image_url?.trim() || null,
      background: form.background.trim() || EMPTY_AD.background,
      sort_order: form.sort_order,
      is_active: form.is_active,
      is_deleted: form.is_deleted,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      offer_starts_at: form.offer_starts_at || null,
      offer_ends_at: form.offer_ends_at || null,
      price: parsePrice(form.price),
      payment_status: form.payment_status,
      is_home_screen: form.is_home_screen,
    };

    try {
      let adId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("ads").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("ads").insert(payload).select("id").single();
        if (error) throw error;
        adId = data.id;
      }
      if (!adId) throw new Error("Could not save ad");
      await saveAdCoverage(supabase, adId, nationwide, pins);
      showToast(editing ? "Ad updated" : "Ad created");
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save ad");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ad: AdRow) => {
    const ok = await confirm({
      title: "Delete ad?",
      message: `This will permanently remove "${ad.title}". This action cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    const supabase = createClient();
    const { error } = await supabase.from("ads").delete().eq("id", ad.id);
    if (error) {
      showToast(error.message);
      return;
    }
    showToast("Ad deleted");
    setSelected(null);
    await load();
  };

  const modalOpen = creating || !!editing;

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        title="Ads management"
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={openCreate} className="btn-secondary inline-flex w-auto items-center gap-2 py-2.5">
              <Plus size={16} />
              New ad
            </button>
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
              <FilterInput value={search} onChange={setSearch} placeholder="Brand, title, or body" />
            </FilterField>
            <FilterField label="Status">
              <FilterSelect value={status} onChange={setStatus}>
                <option value="all">All</option>
                <option value="live">Live</option>
                <option value="scheduled">Scheduled</option>
                <option value="ended">Ended</option>
                <option value="inactive">Inactive</option>
                <option value="deleted">Deleted</option>
              </FilterSelect>
            </FilterField>
            <FilterField label="Payment">
              <FilterSelect value={payment} onChange={setPayment}>
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </FilterSelect>
            </FilterField>
            <FilterField label="Coverage">
              <FilterSelect value={coverage} onChange={setCoverage}>
                <option value="all">All</option>
                <option value="everywhere">Everywhere</option>
                <option value="targeted">Targeted</option>
              </FilterSelect>
            </FilterField>
            <FilterField label="Placement">
              <FilterSelect value={placement} onChange={setPlacement}>
                <option value="all">All</option>
                <option value="home">Home screen</option>
                <option value="offerly">Offerly only</option>
              </FilterSelect>
            </FilterField>
            {activeFilterCount > 0 ? (
              <div className="flex items-end">
                <button type="button" onClick={clearFilters} className="h-[46px] text-sm font-bold text-blue-deep hover:underline">
                  Clear
                </button>
              </div>
            ) : null}
          </FilterBar>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total ads"
          value={pageStats.total}
          hint={`${pageStats.deleted} deleted`}
          icon={Megaphone}
          tone="blue"
        />
        <StatCard
          label="Live now"
          value={pageStats.live}
          hint={`${pageStats.scheduled} scheduled · ${pageStats.ended} ended`}
          icon={Radio}
          tone="green"
        />
        <StatCard
          label="Clicks"
          value={pageStats.clicks.toLocaleString()}
          hint={`${pageStats.unique.toLocaleString()} unique users`}
          icon={MousePointerClick}
          tone="indigo"
        />
        <StatCard
          label="Paid"
          value={formatMoney(pageStats.paidAmount)}
          hint={`${pageStats.paidCount} paid · ${formatMoney(pageStats.unpaidAmount)} unpaid`}
          icon={Banknote}
          tone="teal"
        />
      </div>

      <div className="mt-4">
        <DataTable
          rows={filtered}
          selectedId={selected?.id}
          emptyMessage="No ads match your filters."
          onRowClick={setSelected}
          defaultSortKey="order"
          defaultSortDir="asc"
          columns={[
            {
              key: "image",
              header: "Image",
              className: "w-16",
              sortable: false,
              render: (row) => <ImageOrEmoji value={row.image_url} alt={row.brand_name} size={40} />,
            },
            {
              key: "campaign",
              header: "Campaign",
              sortValue: (row) => row.brand_name,
              render: (row) => (
                <div>
                  <p className="font-semibold">{row.brand_name}</p>
                  <p className="text-xs text-ink-soft">{row.title}</p>
                </div>
              ),
            },
            {
              key: "price",
              header: "Price",
              sortValue: (row) => row.price ?? -1,
              render: (row) => <span className="font-semibold">{formatMoney(row.price)}</span>,
            },
            {
              key: "payment",
              header: "Payment",
              sortValue: (row) => row.payment_status,
              render: (row) => (
                <Badge className={paymentBadge(row.payment_status)}>
                  {row.payment_status === "paid" ? "Paid" : "Unpaid"}
                </Badge>
              ),
            },
            {
              key: "placement",
              header: "Placement",
              sortValue: (row) => (row.is_home_screen ? 1 : 0),
              render: (row) => (
                <Badge className={row.is_home_screen ? "bg-blue-soft text-blue-deep" : "bg-surface text-ink-soft"}>
                  {row.is_home_screen ? "Home + Offerly" : "Offerly only"}
                </Badge>
              ),
            },
            {
              key: "status",
              header: "Status",
              sortValue: (row) => adRunState(row),
              render: (row) => {
                const run = adRunState(row);
                return <Badge className={adRunStateBadge(run)}>{adRunStateLabel(run)}</Badge>;
              },
            },
            {
              key: "clicks",
              header: "Clicks",
              sortValue: (row) => row.totalClicks,
              render: (row) => (
                <div>
                  <p className="font-semibold">{row.totalClicks.toLocaleString()}</p>
                  <p className="text-xs text-ink-soft">
                    {row.uniqueUsers.toLocaleString()} user{row.uniqueUsers === 1 ? "" : "s"}
                  </p>
                </div>
              ),
            },
            {
              key: "coverage",
              header: "Coverage",
              sortValue: (row) => row.coverage,
              render: (row) => (
                <span className="line-clamp-2 max-w-[220px] text-xs text-ink-soft" title={row.coverage}>
                  {row.coverage}
                </span>
              ),
            },
            {
              key: "schedule",
              header: "Schedule",
              sortValue: (row) => row.starts_at || "",
              render: (row) => (
                <span className="text-xs text-ink-soft">
                  {row.starts_at ? formatDateTime(row.starts_at) : "Anytime"}
                  {" → "}
                  {row.ends_at ? formatDateTime(row.ends_at) : "No end"}
                </span>
              ),
            },
            {
              key: "order",
              header: "Order",
              sortValue: (row) => row.sort_order,
              render: (row) => <span>{row.sort_order}</span>,
            },
            {
              key: "actions",
              header: "Actions",
              className: "w-24",
              render: (row) => (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => void openEdit(row)}
                    className="rounded-[10px] border border-line p-2 hover:bg-surface"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => void remove(row)}
                    className="rounded-[10px] border border-line p-2 text-rose hover:bg-rose-soft"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {selected ? (
        <AdDetailPanel
          key={selected.id}
          ad={selected}
          onClose={closePanel}
          onEdit={() => void openEdit(selected)}
          onDelete={() => void remove(selected)}
        />
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ink/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-line bg-white shadow-pop">
            <div className="border-b border-line px-6 py-5">
              <h2 className="font-display text-xl font-bold">{editing ? "Edit ad" : "New ad"}</h2>
              <p className="mt-1 text-sm text-ink-soft">Fill in the campaign details and preview how it will look.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  {[
                    ["brand_name", "Brand name"],
                    ["title", "Title"],
                    ["body", "Body"],
                    ["cta_label", "CTA label"],
                    ["cta_url", "CTA URL"],
                    ["background", "Background (CSS)"],
                  ].map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="mb-1 block text-xs font-bold text-ink-soft">{label}</span>
                      <input
                        className="input-box py-3 text-sm"
                        value={String(form[key as keyof AdForm] ?? "")}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      />
                    </label>
                  ))}

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-ink-soft">Image URL</span>
                    <input
                      className="input-box py-3 text-sm"
                      value={form.image_url ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                      placeholder="https://..."
                    />
                    <p className="mt-1.5 text-[11px] text-ink-faint">
                      Recommended banner size: <strong>1200 × 500 px</strong> (2.4:1 ratio) for best fit on home.
                    </p>
                    <ImagePreview src={form.image_url} alt={form.brand_name} className="mt-3" height={180} />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-ink-soft">Price (₹)</span>
                      <input
                        type="number"
                        min={0}
                        className="input-box py-3 text-sm"
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                        placeholder="Optional"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-ink-soft">Payment</span>
                      <select
                        className="input-box py-3 text-sm"
                        value={form.payment_status}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, payment_status: e.target.value as AdPaymentStatus }))
                        }
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">Paid</option>
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-ink-soft">Sort order</span>
                    <input
                      type="number"
                      className="input-box py-3 text-sm"
                      value={form.sort_order}
                      onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-ink-soft">Banner starts at</span>
                      <input
                        type="datetime-local"
                        className="input-box py-3 text-sm"
                        value={toDatetimeLocal(form.starts_at)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-ink-soft">Banner ends at</span>
                      <input
                        type="datetime-local"
                        className="input-box py-3 text-sm"
                        value={toDatetimeLocal(form.ends_at)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-ink-soft">Offer starts at</span>
                      <input
                        type="datetime-local"
                        className="input-box py-3 text-sm"
                        value={toDatetimeLocal(form.offer_starts_at)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            offer_starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-ink-soft">Offer ends at</span>
                      <input
                        type="datetime-local"
                        className="input-box py-3 text-sm"
                        value={toDatetimeLocal(form.offer_ends_at)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            offer_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    />
                    Active
                  </label>

                  <label className="flex cursor-pointer items-start gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="mt-0.5 cursor-pointer"
                      checked={form.is_home_screen}
                      onChange={(e) => setForm((f) => ({ ...f, is_home_screen: e.target.checked }))}
                    />
                    <span>
                      Show on home screen
                      <span className="mt-0.5 block text-xs font-medium text-ink-soft">
                        All ads appear in Offerly. Check this to also show in the home carousel.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-bold text-ink-soft">Live preview</p>
                  <div
                    className="overflow-hidden rounded-[12px] border border-line shadow-card"
                    style={{ background: form.background || EMPTY_AD.background }}
                  >
                    {form.image_url ? (
                      <ImagePreview src={form.image_url} alt={form.brand_name} height={200} className="rounded-none border-0" />
                    ) : null}
                    <div className="p-6 text-white">
                      <p className="text-xs font-bold uppercase tracking-wide opacity-80">{form.brand_name || "Brand name"}</p>
                      <h3 className="mt-2 font-display text-2xl font-extrabold">{form.title || "Ad title"}</h3>
                      {form.body ? <p className="mt-2 text-sm leading-relaxed opacity-90">{form.body}</p> : null}
                      {form.cta_label ? (
                        <span className="mt-4 inline-flex rounded-full bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur">
                          {form.cta_label}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <p className="mb-3 text-xs font-bold text-ink-soft">Where this ad shows</p>
                <AdCoverageEditor
                  nationwide={nationwide}
                  pins={pins}
                  onNationwideChange={setNationwide}
                  onPinsChange={setPins}
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-line px-6 py-4">
              <button type="button" className="btn-secondary flex-1" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
