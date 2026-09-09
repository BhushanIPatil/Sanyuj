"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ImageOrEmoji, ImagePreview } from "@/components/ui/ImageOrEmoji";
import { FilterBar, FilterField, FilterSelect } from "@/components/ui/FilterBar";
import {
  contentCategoryKindLabel,
  slugFromName,
  type ContentCategory,
  type ContentCategoryKind,
} from "@/lib/contentCategories";

type ModalMode = { type: "none" } | { type: "create" } | { type: "edit"; item: ContentCategory };

export function ContentCategoriesPanel() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<ContentCategory[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [kindFilter, setKindFilter] = useState<"all" | ContentCategoryKind>("all");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>({ type: "none" });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    kind: "offer" as ContentCategoryKind,
    slug: "",
    name: "",
    emoji: "",
    sort_order: 0,
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [catsRes, adsRes, noticesRes] = await Promise.all([
      supabase.from("content_categories").select("*").order("kind").order("sort_order"),
      supabase.from("ads").select("category_id").eq("is_deleted", false).not("category_id", "is", null),
      supabase.from("notices").select("category_id").eq("is_deleted", false).not("category_id", "is", null),
    ]);
    if (catsRes.error) showToast(catsRes.error.message);
    setRows((catsRes.data as ContentCategory[]) ?? []);
    const counts: Record<string, number> = {};
    for (const row of (adsRes.data as { category_id: string }[] | null) ?? []) {
      counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
    }
    for (const row of (noticesRes.data as { category_id: string }[] | null) ?? []) {
      counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
    }
    setUsage(counts);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(
    () => rows.filter((r) => kindFilter === "all" || r.kind === kindFilter),
    [rows, kindFilter],
  );

  const openCreate = () => {
    const kind: ContentCategoryKind = kindFilter === "all" ? "offer" : kindFilter;
    const nextOrder = rows.filter((r) => r.kind === kind).length + 1;
    setForm({ kind, slug: "", name: "", emoji: "", sort_order: nextOrder, is_active: true });
    setModal({ type: "create" });
  };

  const openEdit = (item: ContentCategory) => {
    setForm({
      kind: item.kind,
      slug: item.slug,
      name: item.name,
      emoji: item.emoji ?? "",
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setModal({ type: "edit", item });
  };

  const save = async () => {
    const name = form.name.trim();
    const slug = (form.slug.trim() || slugFromName(name)).replace(/^_|_$/g, "");
    if (!name || !slug) {
      showToast("Name is required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      kind: form.kind,
      name,
      slug,
      emoji: form.emoji.trim() || null,
      sort_order: form.sort_order,
      is_active: form.is_active,
      is_deleted: false,
    };
    try {
      if (modal.type === "edit") {
        const { error } = await supabase.from("content_categories").update(payload).eq("id", modal.item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("content_categories").insert(payload);
        if (error) throw error;
      }
      showToast(modal.type === "edit" ? "Category updated" : "Category created");
      setModal({ type: "none" });
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save category");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: ContentCategory) => {
    const count = usage[item.id] ?? 0;
    const ok = await confirm({
      title: "Delete category?",
      message:
        count > 0
          ? `"${item.name}" is used by ${count} ${item.kind === "offer" ? "ads" : "notices"}. They will become uncategorized.`
          : `This will permanently remove "${item.name}".`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.from("content_categories").delete().eq("id", item.id);
    if (error) showToast(error.message);
    else {
      showToast("Category deleted");
      void load();
    }
  };

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Offers & Notify</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            One list, flagged as offer or notify — clothing and utensils for Offerly, events and functions for Notify.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-secondary inline-flex w-auto items-center gap-2 py-2 text-sm">
          <Plus size={14} />
          New category
        </button>
      </div>

      <div className="mb-3">
        <FilterBar>
          <FilterField label="Used for">
            <FilterSelect value={kindFilter} onChange={(v) => setKindFilter(v as "all" | ContentCategoryKind)}>
              <option value="all">All</option>
              <option value="offer">Offers</option>
              <option value="notice">Notify</option>
            </FilterSelect>
          </FilterField>
        </FilterBar>
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading categories…</p>
      ) : (
        <DataTable
          rows={visibleRows}
          emptyMessage="No offer or notify categories yet."
          defaultSortKey="order"
          defaultSortDir="asc"
          columns={[
            {
              key: "icon",
              header: "Icon",
              className: "w-16",
              sortable: false,
              render: (r) => <ImageOrEmoji value={r.emoji} alt={r.name} size={36} />,
            },
            {
              key: "name",
              header: "Name",
              sortValue: (r) => r.name,
              render: (r) => (
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="font-mono text-[11px] text-ink-faint">{r.slug}</p>
                </div>
              ),
            },
            {
              key: "kind",
              header: "Used for",
              sortValue: (r) => r.kind,
              render: (r) => (
                <Badge className={r.kind === "offer" ? "bg-blue-soft text-blue-deep" : "bg-indigo-soft text-indigo"}>
                  {contentCategoryKindLabel(r.kind)}
                </Badge>
              ),
            },
            {
              key: "used",
              header: "Used by",
              sortValue: (r) => usage[r.id] ?? 0,
              render: (r) => <span>{usage[r.id] ?? 0}</span>,
            },
            { key: "order", header: "Order", sortValue: (r) => r.sort_order, render: (r) => <span>{r.sort_order}</span> },
            {
              key: "status",
              header: "Status",
              sortValue: (r) => (r.is_deleted ? 2 : r.is_active ? 0 : 1),
              render: (r) => (
                <Badge className={r.is_active && !r.is_deleted ? "bg-green-soft text-green-deep" : "bg-surface text-ink-soft"}>
                  {r.is_deleted ? "Deleted" : r.is_active ? "Active" : "Inactive"}
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "",
              className: "w-24",
              render: (r) => (
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(r)} className="cursor-pointer rounded-[10px] border border-line p-2 hover:bg-surface">
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(r)}
                    className="cursor-pointer rounded-[10px] border border-line p-2 text-rose hover:bg-rose-soft"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {modal.type !== "none" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-[24px] border border-line bg-white p-6 shadow-pop">
            <h2 className="font-display text-lg font-bold">{modal.type === "edit" ? "Edit category" : "New category"}</h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Used for</span>
                <select
                  className="input-box cursor-pointer py-3 text-sm"
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as ContentCategoryKind }))}
                >
                  <option value="offer">Offer (Offerly)</option>
                  <option value="notice">Notify</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Name</span>
                <input
                  className="input-box py-3 text-sm"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                      slug: modal.type === "create" ? slugFromName(e.target.value) : f.slug,
                    }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Slug</span>
                <input className="input-box py-3 text-sm" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Emoji or image URL</span>
                <input
                  className="input-box py-3 text-sm"
                  value={form.emoji}
                  onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                  placeholder="👕 or https://..."
                />
                <div className="mt-3 flex items-center gap-3">
                  <ImageOrEmoji value={form.emoji} alt={form.name} size={48} />
                  <ImagePreview src={form.emoji} alt={form.name} className="max-w-[200px] flex-1" height={80} />
                </div>
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
            <div className="mt-6 flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal({ type: "none" })}>
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
