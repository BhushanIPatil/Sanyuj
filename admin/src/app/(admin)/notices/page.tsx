"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Newspaper, Pencil, Plus, Radio, SlidersHorizontal, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
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
  fetchNoticeCoverage,
  groupNoticeCoverage,
  saveNoticeCoverage,
  summarizeNoticePin,
  type NoticePinDraft,
} from "@/lib/geo/noticeCoverage";
import { nestedContentCategory, type ContentCategory } from "@/lib/contentCategories";
import {
  NoticeDetailPanel,
  noticeRunState,
  noticeRunStateBadge,
  noticeRunStateLabel,
  type NoticeRow,
} from "./NoticeDetailPanel";

type NoticeForm = {
  title: string;
  body: string;
  image_url: string;
  cta_label: string;
  cta_url: string;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
  category_id: string;
};

const EMPTY_FILTERS = {
  search: "",
  status: "all",
  coverage: "all",
  category: "all",
};

const EMPTY_NOTICE: NoticeForm = {
  title: "",
  body: "",
  image_url: "",
  cta_label: "",
  cta_url: "",
  sort_order: 0,
  is_active: true,
  starts_at: null,
  ends_at: null,
  event_starts_at: null,
  event_ends_at: null,
  category_id: "",
};

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formFromNotice(row: NoticeRow): NoticeForm {
  return {
    title: row.title,
    body: row.body ?? "",
    image_url: row.image_url ?? "",
    cta_label: row.cta_label ?? "",
    cta_url: row.cta_url ?? "",
    sort_order: row.sort_order,
    is_active: row.is_active,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    event_starts_at: row.event_starts_at,
    event_ends_at: row.event_ends_at,
    category_id: row.category_id ?? "",
  };
}

export default function NoticesPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [coverage, setCoverage] = useState("all");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [selected, setSelected] = useState<NoticeRow | null>(null);
  const [editing, setEditing] = useState<NoticeRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_NOTICE);
  const [nationwide, setNationwide] = useState(true);
  const [pins, setPins] = useState<NoticePinDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notices")
      .select("*, category:content_categories(id, name, slug, emoji)")
      .order("sort_order", { ascending: true });
    if (error) {
      showToast(error.message);
      setLoading(false);
      return;
    }

    const { data: catRows } = await supabase
      .from("content_categories")
      .select("*")
      .eq("kind", "notice")
      .eq("is_deleted", false)
      .order("sort_order");
    setCategories((catRows as ContentCategory[]) ?? []);

    const list = (data as Array<Omit<NoticeRow, "coverage" | "category"> & { category?: unknown }>) ?? [];
    const ids = list.map((n) => n.id);
    const labels: Record<string, string> = {};

    if (ids.length) {
      const { data: nsa } = await supabase
        .from("notice_service_areas")
        .select("notice_id, pincode, locality_id, area_id, localities(name), areas(name)")
        .in("notice_id", ids)
        .eq("is_deleted", false);
      const raw =
        (nsa as Array<{
          notice_id: string;
          pincode: string;
          locality_id: string | null;
          area_id: string | null;
          localities: { name: string } | null;
          areas: { name: string } | null;
        }> | null) ?? [];
      const byNotice = new Map<string, typeof raw>();
      for (const row of raw) {
        const cur = byNotice.get(row.notice_id) ?? [];
        cur.push(row);
        byNotice.set(row.notice_id, cur);
      }
      for (const notice of list) {
        const rowsForNotice = byNotice.get(notice.id) ?? [];
        if (!rowsForNotice.length) {
          labels[notice.id] = "Everywhere";
          continue;
        }
        const drafts = groupNoticeCoverage(
          rowsForNotice.map((r) => ({
            id: r.notice_id,
            ad_id: r.notice_id,
            pincode: r.pincode,
            locality_id: r.locality_id,
            area_id: r.area_id,
            localities: r.localities ? { id: "", name: r.localities.name } : null,
            areas: r.areas ? { id: "", name: r.areas.name } : null,
          })),
        );
        labels[notice.id] = drafts.map((p) => `${p.pincode} (${summarizeNoticePin(p)})`).join(" · ");
      }
    }

    const mapped: NoticeRow[] = list.map((n) => ({
      ...n,
      category_id: n.category_id ?? null,
      category: nestedContentCategory(n.category),
      coverage: labels[n.id] || "Everywhere",
    }));

    setRows(mapped);
    setSelected((cur) => (cur ? (mapped.find((r) => r.id === cur.id) ?? null) : null));
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeFilterCount = [search.trim() ? 1 : 0, status !== "all" ? 1 : 0, coverage !== "all" ? 1 : 0, category !== "all" ? 1 : 0].reduce(
    (a, b) => a + b,
    0,
  );

  const clearFilters = () => {
    setSearch(EMPTY_FILTERS.search);
    setStatus(EMPTY_FILTERS.status);
    setCoverage(EMPTY_FILTERS.coverage);
    setCategory(EMPTY_FILTERS.category);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const run = noticeRunState(r);
      if (status !== "all" && run !== status) return false;
      if (coverage === "everywhere" && r.coverage !== "Everywhere") return false;
      if (coverage === "targeted" && r.coverage === "Everywhere") return false;
      if (category === "none" && r.category_id) return false;
      if (category !== "all" && category !== "none" && r.category_id !== category) return false;
      if (q) {
        const hay = `${r.title} ${r.body ?? ""} ${r.category?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, status, coverage, category]);

  const pageStats = useMemo(() => {
    const live = rows.filter((r) => noticeRunState(r) === "live").length;
    const scheduled = rows.filter((r) => noticeRunState(r) === "scheduled").length;
    const ended = rows.filter((r) => noticeRunState(r) === "ended").length;
    return { total: rows.length, live, scheduled, ended };
  }, [rows]);

  const closePanel = useCallback(() => setSelected(null), []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_NOTICE);
    setNationwide(true);
    setPins([]);
    setCreating(true);
  };

  const openEdit = async (row: NoticeRow) => {
    setCreating(false);
    setEditing(row);
    setForm(formFromNotice(row));
    const supabase = createClient();
    const rowsForNotice = await fetchNoticeCoverage(supabase, row.id);
    const drafts = groupNoticeCoverage(rowsForNotice);
    setPins(drafts);
    setNationwide(drafts.length === 0);
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (!form.title.trim()) {
      showToast("Title is required");
      return;
    }
    if (!form.category_id) {
      showToast("Pick a category");
      return;
    }
    if (!nationwide && pins.length === 0) {
      showToast("Add at least one pincode, or show everywhere");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      title: form.title.trim(),
      body: form.body.trim() || null,
      image_url: form.image_url.trim() || null,
      cta_label: form.cta_label.trim() || null,
      cta_url: form.cta_url.trim() || null,
      sort_order: form.sort_order,
      is_active: form.is_active,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      event_starts_at: form.event_starts_at || null,
      event_ends_at: form.event_ends_at || null,
      category_id: form.category_id || null,
    };

    try {
      let noticeId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("notices").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("notices").insert(payload).select("id").single();
        if (error) throw error;
        noticeId = data.id;
      }
      if (!noticeId) throw new Error("Could not save notice");
      await saveNoticeCoverage(supabase, noticeId, nationwide, pins);
      showToast(editing ? "Notice updated" : "Notice created");
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save notice");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: NoticeRow) => {
    const ok = await confirm({
      title: "Delete notice?",
      message: `This will permanently remove "${row.title}". This action cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    const supabase = createClient();
    const { error } = await supabase.from("notices").delete().eq("id", row.id);
    if (error) {
      showToast(error.message);
      return;
    }
    showToast("Notice deleted");
    setSelected(null);
    await load();
  };

  const modalOpen = creating || !!editing;

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader
        title="Notify"
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={openCreate} className="btn-secondary inline-flex w-auto items-center gap-2 py-2.5">
              <Plus size={16} />
              New notice
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
              <FilterInput value={search} onChange={setSearch} placeholder="Title or body" />
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
            <FilterField label="Coverage">
              <FilterSelect value={coverage} onChange={setCoverage}>
                <option value="all">All</option>
                <option value="everywhere">Everywhere</option>
                <option value="targeted">Targeted</option>
              </FilterSelect>
            </FilterField>
            <FilterField label="Category">
              <FilterSelect value={category} onChange={setCategory}>
                <option value="all">All</option>
                <option value="none">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard label="Total" value={pageStats.total} icon={Newspaper} tone="blue" />
        <StatCard
          label="Live now"
          value={pageStats.live}
          hint={`${pageStats.scheduled} scheduled · ${pageStats.ended} ended`}
          icon={Radio}
          tone="green"
        />
      </div>

      <div className="mt-4">
        <DataTable
          rows={filtered}
          selectedId={selected?.id}
          emptyMessage="No notices match your filters."
          onRowClick={setSelected}
          defaultSortKey="order"
          defaultSortDir="asc"
          columns={[
            {
              key: "image",
              header: "Image",
              className: "w-16",
              sortable: false,
              render: (row) => <ImageOrEmoji value={row.image_url} alt={row.title} size={40} />,
            },
            {
              key: "title",
              header: "Notice",
              sortValue: (row) => row.title,
              render: (row) => (
                <div>
                  <p className="font-semibold">{row.title}</p>
                  {row.body ? <p className="line-clamp-1 text-xs text-ink-soft">{row.body}</p> : null}
                </div>
              ),
            },
            {
              key: "category",
              header: "Category",
              sortValue: (row) => row.category?.name ?? "",
              render: (row) =>
                row.category ? (
                  <Badge className="bg-indigo-soft text-indigo">{row.category.name}</Badge>
                ) : (
                  <span className="text-xs text-ink-faint">—</span>
                ),
            },
            {
              key: "status",
              header: "Status",
              sortValue: (row) => noticeRunState(row),
              render: (row) => {
                const run = noticeRunState(row);
                return <Badge className={noticeRunStateBadge(run)}>{noticeRunStateLabel(run)}</Badge>;
              },
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
              key: "shows",
              header: "Shows",
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
              key: "event",
              header: "Event",
              sortValue: (row) => row.event_starts_at || row.event_ends_at || "",
              render: (row) =>
                row.event_starts_at || row.event_ends_at ? (
                  <span className="text-xs text-ink-soft">
                    {row.event_starts_at ? formatDateTime(row.event_starts_at) : "Not set"}
                    {" → "}
                    {row.event_ends_at ? formatDateTime(row.event_ends_at) : "Not set"}
                  </span>
                ) : (
                  <span className="text-xs text-ink-faint">—</span>
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
        <NoticeDetailPanel
          key={selected.id}
          notice={selected}
          onClose={closePanel}
          onEdit={() => void openEdit(selected)}
          onDelete={() => void remove(selected)}
        />
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ink/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-line bg-white shadow-pop">
            <div className="border-b border-line px-6 py-5">
              <h2 className="font-display text-xl font-bold">{editing ? "Edit notice" : "New notice"}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Area events and announcements. Shown in Notify. Optional link — no click tracking.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-ink-soft">Title</span>
                  <input
                    className="input-box py-3 text-sm"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-ink-soft">Category</span>
                  <select
                    className="input-box py-3 text-sm"
                    value={form.category_id}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    {categories
                      .filter((c) => c.is_active || c.id === form.category_id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-ink-soft">Body</span>
                  <textarea
                    className="input-box min-h-[120px] py-3 text-sm"
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-ink-soft">Image URL</span>
                  <input
                    className="input-box py-3 text-sm"
                    value={form.image_url}
                    onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://..."
                  />
                  <ImagePreview src={form.image_url} alt={form.title} className="mt-3" height={160} />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-ink-soft">Link label</span>
                  <input
                    className="input-box py-3 text-sm"
                    value={form.cta_label}
                    onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
                    placeholder="Open link"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-ink-soft">Link URL</span>
                  <input
                    className="input-box py-3 text-sm"
                    value={form.cta_url}
                    onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </label>

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
                    <span className="mb-1 block text-xs font-bold text-ink-soft">Show from</span>
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
                    <span className="mb-1 block text-xs font-bold text-ink-soft">Show until</span>
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
                <p className="text-[11px] font-medium text-ink-faint">When this notice appears in the app. Neighbours never see these dates.</p>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-ink-soft">Event starts</span>
                    <input
                      type="datetime-local"
                      className="input-box py-3 text-sm"
                      value={toDatetimeLocal(form.event_starts_at)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          event_starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                        }))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-ink-soft">Event ends</span>
                    <input
                      type="datetime-local"
                      className="input-box py-3 text-sm"
                      value={toDatetimeLocal(form.event_ends_at)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          event_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                        }))
                      }
                    />
                  </label>
                </div>
                <p className="text-[11px] font-medium text-ink-faint">Optional. Shown to neighbours if you set them.</p>

                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="cursor-pointer"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  Active
                </label>
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <p className="mb-3 text-xs font-bold text-ink-soft">Where this notice shows</p>
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
