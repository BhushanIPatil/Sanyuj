"use client";

import Link from "next/link";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ImageOrEmoji, ImagePreview } from "@/components/ui/ImageOrEmoji";
import { CategoriesPageSkeleton } from "@/components/ui/Skeleton";
import { FilterBar, FilterField, FilterSelect } from "@/components/ui/FilterBar";
import { ChangeCategoryModal } from "@/components/ChangeCategoryModal";
import { accountStatusBadge, accountStatusLabel } from "@/lib/status";
import { ContentCategoriesPanel } from "./ContentCategoriesPanel";

type CategoryGroup = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  is_deleted: boolean;
};

type Category = {
  id: string;
  group_id: string;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
  is_deleted: boolean;
  is_other: boolean;
  category_groups: { name: string; slug: string } | null;
};

type CatBusiness = {
  id: string;
  name: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  profiles: { full_name: string | null; phone: string | null } | null;
};

type ModalMode =
  | { type: "none" }
  | { type: "group-create" }
  | { type: "group-edit"; item: CategoryGroup }
  | { type: "category-create" }
  | { type: "category-edit"; item: Category };

async function readError(res: Response) {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error || `Request failed (${res.status})`;
}

function slugFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function CategoriesPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bizCounts, setBizCounts] = useState<Record<string, number>>({});
  const [kind, setKind] = useState("all");
  const [tab, setTab] = useState<"providers" | "content">("providers");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>({ type: "none" });
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [catBusinesses, setCatBusinesses] = useState<CatBusiness[]>([]);
  const [bizLoading, setBizLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeSaving, setChangeSaving] = useState(false);
  const [changeError, setChangeError] = useState("");

  const [groupForm, setGroupForm] = useState({
    slug: "",
    name: "",
    sort_order: 0,
    is_active: true,
  });

  const [categoryForm, setCategoryForm] = useState({
    group_id: "",
    slug: "",
    name: "",
    emoji: "",
    sort_order: 0,
    is_active: true,
    is_other: false,
  });

  const otherGroupId = groups.find((g) => g.slug === "other")?.id ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [groupsRes, catsRes, bizRes] = await Promise.all([
      supabase.from("category_groups").select("*").order("sort_order"),
      supabase.from("categories").select("*, category_groups(name, slug)").order("sort_order"),
      supabase.from("businesses").select("category_id").eq("is_deleted", false),
    ]);
    const cats = (catsRes.data as unknown as Category[]) ?? [];
    setGroups((groupsRes.data as CategoryGroup[]) ?? []);
    setCategories(cats);
    const counts: Record<string, number> = {};
    for (const row of (bizRes.data as { category_id: string }[] | null) ?? []) {
      counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
    }
    setBizCounts(counts);
    setSelectedCategory((cur) => (cur ? (cats.find((c) => c.id === cur.id) ?? null) : null));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadCategoryBusinesses = useCallback(async (categoryId: string) => {
    setBizLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("businesses")
      .select("id, name, is_active, is_deleted, created_at, profiles(full_name, phone)")
      .eq("category_id", categoryId)
      .order("name");
    setCatBusinesses((data as unknown as CatBusiness[]) ?? []);
    setSelectedIds(new Set());
    setBizLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setCatBusinesses([]);
      setSelectedIds(new Set());
      return;
    }
    void loadCategoryBusinesses(selectedCategory.id);
  }, [selectedCategory, loadCategoryBusinesses]);

  const visibleCategories = useMemo(() => {
    return categories.filter((c) => {
      if (kind === "other") return c.is_other;
      if (kind === "official") return !c.is_other;
      return true;
    });
  }, [categories, kind]);

  const saveGroup = async () => {
    if (!groupForm.slug.trim() || !groupForm.name.trim()) {
      showToast("Slug and name are required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      slug: groupForm.slug.trim().toLowerCase().replace(/\s+/g, "_"),
      name: groupForm.name.trim(),
      sort_order: groupForm.sort_order,
      is_active: groupForm.is_active,
    };

    if (modal.type === "group-edit") {
      const { error } = await supabase.from("category_groups").update(payload).eq("id", modal.item.id);
      if (error) showToast(error.message);
      else showToast("Group updated");
    } else {
      const { error } = await supabase.from("category_groups").insert(payload);
      if (error) showToast(error.message);
      else showToast("Group created");
    }
    setSaving(false);
    setModal({ type: "none" });
    void load();
  };

  const saveCategory = async () => {
    if (!categoryForm.group_id || !categoryForm.slug.trim() || !categoryForm.name.trim()) {
      showToast("Group, slug, and name are required");
      return;
    }
    if (!categoryForm.is_other && categoryForm.group_id === otherGroupId) {
      showToast("Move this category out of Other before publishing it");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      group_id: categoryForm.group_id,
      slug: categoryForm.slug.trim().toLowerCase().replace(/\s+/g, "_"),
      name: categoryForm.name.trim(),
      emoji: categoryForm.emoji.trim() || null,
      sort_order: categoryForm.sort_order,
      is_active: categoryForm.is_active,
      is_other: categoryForm.is_other,
    };

    if (modal.type === "category-edit") {
      const { error } = await supabase.from("categories").update(payload).eq("id", modal.item.id);
      if (error) showToast(error.message);
      else showToast(categoryForm.is_other ? "Category updated" : "Category published");
    } else {
      const { error } = await supabase.from("categories").insert({ ...payload, is_other: false });
      if (error) showToast(error.message);
      else showToast("Category created");
    }
    setSaving(false);
    setModal({ type: "none" });
    void load();
  };

  const deleteGroup = async (group: CategoryGroup) => {
    const ok = await confirm({
      title: "Delete category group?",
      message: `This will remove "${group.name}" and may affect linked categories.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    const supabase = createClient();
    const { error } = await supabase.from("category_groups").delete().eq("id", group.id);
    if (error) showToast(error.message);
    else {
      showToast("Group deleted");
      void load();
    }
  };

  const deleteCategory = async (cat: Category) => {
    const count = bizCounts[cat.id] ?? 0;
    const ok = await confirm({
      title: "Delete category?",
      message:
        count > 0
          ? `"${cat.name}" is used by ${count} businesses. Move them first, or deletion will fail.`
          : `This will permanently remove "${cat.name}".`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", cat.id);
    if (error) showToast(error.message);
    else {
      showToast("Category deleted");
      if (selectedCategory?.id === cat.id) setSelectedCategory(null);
      void load();
    }
  };

  const recategorize = async (categoryId: string) => {
    setChangeSaving(true);
    setChangeError("");
    try {
      const res = await fetch("/api/businesses/recategorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds], category_id: categoryId }),
      });
      if (!res.ok) throw new Error(await readError(res));
      showToast(`Updated ${selectedIds.size} ${selectedIds.size === 1 ? "business" : "businesses"}`);
      setChangeOpen(false);
      setSelectedIds(new Set());
      await load();
      if (selectedCategory) await loadCategoryBusinesses(selectedCategory.id);
    } catch (e) {
      setChangeError(e instanceof Error ? e.message : "Could not update category");
    } finally {
      setChangeSaving(false);
    }
  };

  const openGroupCreate = () => {
    setGroupForm({ slug: "", name: "", sort_order: groups.length + 1, is_active: true });
    setModal({ type: "group-create" });
  };

  const openGroupEdit = (item: CategoryGroup) => {
    setGroupForm({
      slug: item.slug,
      name: item.name,
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setModal({ type: "group-edit", item });
  };

  const openCategoryCreate = () => {
    setCategoryForm({
      group_id: groups.find((g) => g.slug !== "other")?.id ?? groups[0]?.id ?? "",
      slug: "",
      name: "",
      emoji: "",
      sort_order: categories.length + 1,
      is_active: true,
      is_other: false,
    });
    setModal({ type: "category-create" });
  };

  const openCategoryEdit = (item: Category) => {
    setCategoryForm({
      group_id: item.group_id,
      slug: item.slug,
      name: item.name,
      emoji: item.emoji ?? "",
      sort_order: item.sort_order,
      is_active: item.is_active,
      is_other: item.is_other,
    });
    setModal({ type: "category-edit", item });
  };

  const setIsOther = (checked: boolean) => {
    setCategoryForm((f) => {
      const next = { ...f, is_other: checked };
      if (!checked && f.slug.startsWith("other_")) {
        next.slug = slugFromName(f.name);
      }
      if (!checked && f.group_id === otherGroupId) {
        next.group_id = groups.find((g) => g.slug !== "other")?.id ?? f.group_id;
      }
      if (checked && otherGroupId) next.group_id = otherGroupId;
      return next;
    });
  };

  if (loading) return <CategoriesPageSkeleton />;

  const pendingCount = categories.filter((c) => c.is_other && !c.is_deleted).length;

  return (
    <div className="page-pad">
      <PageHeader title="Categories" />

      <div className="mt-4 flex w-fit gap-1 rounded-[14px] border border-line bg-white p-1">
        {(
          [
            ["providers", "Providers"],
            ["content", "Offers & Notify"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-[12px] px-3.5 py-2 text-sm font-semibold ${
              tab === id ? "bg-blue-soft text-blue-deep" : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "content" ? <ContentCategoriesPanel /> : null}

      {tab === "providers" ? (
      <>
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Category groups</h2>
          <button type="button" onClick={openGroupCreate} className="btn-secondary inline-flex w-auto items-center gap-2 py-2 text-sm">
            <Plus size={14} />
            New group
          </button>
        </div>
        <DataTable
          rows={groups}
          emptyMessage="No category groups."
          defaultSortKey="order"
          defaultSortDir="asc"
          columns={[
            { key: "name", header: "Name", sortValue: (r) => r.name, render: (r) => <span className="font-semibold">{r.name}</span> },
            { key: "slug", header: "Slug", sortValue: (r) => r.slug, render: (r) => <span className="font-mono text-xs">{r.slug}</span> },
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
                  <button type="button" onClick={() => openGroupEdit(r)} className="cursor-pointer rounded-[10px] border border-line p-2 hover:bg-surface">
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => void deleteGroup(r)} className="cursor-pointer rounded-[10px] border border-line p-2 text-rose hover:bg-rose-soft">
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Categories</h2>
            {pendingCount > 0 ? (
              <p className="mt-0.5 text-xs font-semibold text-amber">
                {pendingCount} custom {pendingCount === 1 ? "name" : "names"} waiting to be published
              </p>
            ) : null}
          </div>
          <button type="button" onClick={openCategoryCreate} className="btn-secondary inline-flex w-auto items-center gap-2 py-2 text-sm">
            <Plus size={14} />
            New category
          </button>
        </div>
        <div className="mb-3">
          <FilterBar>
            <FilterField label="Type">
              <FilterSelect value={kind} onChange={setKind}>
                <option value="all">All</option>
                <option value="official">Official</option>
                <option value="other">Other (pending)</option>
              </FilterSelect>
            </FilterField>
          </FilterBar>
        </div>
        <DataTable
          rows={visibleCategories}
          selectedId={selectedCategory?.id}
          onRowClick={setSelectedCategory}
          emptyMessage="No categories."
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
                  {r.is_other ? (
                    <Badge className="mt-1 bg-amber-soft text-amber">Other</Badge>
                  ) : null}
                </div>
              ),
            },
            { key: "group", header: "Group", sortValue: (r) => r.category_groups?.name ?? "", render: (r) => <span>{r.category_groups?.name ?? "—"}</span> },
            { key: "slug", header: "Slug", sortValue: (r) => r.slug, render: (r) => <span className="font-mono text-xs">{r.slug}</span> },
            {
              key: "businesses",
              header: "Businesses",
              sortValue: (r) => bizCounts[r.id] ?? 0,
              render: (r) => <span>{bizCounts[r.id] ?? 0}</span>,
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
                  <button type="button" onClick={() => openCategoryEdit(r)} className="cursor-pointer rounded-[10px] border border-line p-2 hover:bg-surface">
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => void deleteCategory(r)} className="cursor-pointer rounded-[10px] border border-line p-2 text-rose hover:bg-rose-soft">
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>

      {selectedCategory ? (
        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">
                Businesses in {selectedCategory.name}
              </h2>
              <p className="mt-0.5 text-xs text-ink-soft">
                Select records to move them to another category
                {selectedCategory.is_other ? ", or edit this category to publish it." : "."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.size > 0 ? (
                <button
                  type="button"
                  className="btn-secondary inline-flex w-auto items-center gap-2 py-2 text-sm"
                  onClick={() => {
                    setChangeError("");
                    setChangeOpen(true);
                  }}
                >
                  <Tags size={14} />
                  Change category ({selectedIds.size})
                </button>
              ) : null}
              <Link
                href={`/providers?category=${selectedCategory.id}`}
                className="btn-secondary inline-flex w-auto items-center gap-2 py-2 text-sm"
              >
                Open in providers
              </Link>
            </div>
          </div>
          {bizLoading ? (
            <p className="text-sm text-ink-soft">Loading businesses…</p>
          ) : (
            <DataTable
              rows={catBusinesses}
              emptyMessage="No businesses in this category."
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              defaultSortKey="name"
              defaultSortDir="asc"
              columns={[
                {
                  key: "name",
                  header: "Business",
                  sortValue: (r) => r.name,
                  render: (r) => <span className="font-semibold">{r.name}</span>,
                },
                {
                  key: "owner",
                  header: "Owner",
                  sortValue: (r) => r.profiles?.full_name || r.profiles?.phone || "",
                  render: (r) => (
                    <div>
                      <p>{r.profiles?.full_name || "—"}</p>
                      <p className="text-xs text-ink-soft">{r.profiles?.phone ?? ""}</p>
                    </div>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  sortValue: (r) => (r.is_deleted ? 2 : r.is_active ? 0 : 1),
                  render: (r) => (
                    <Badge className={accountStatusBadge(r.is_active, r.is_deleted)}>
                      {accountStatusLabel(r.is_active, r.is_deleted)}
                    </Badge>
                  ),
                },
              ]}
            />
          )}
        </section>
      ) : null}

      {modal.type === "group-create" || modal.type === "group-edit" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-[24px] border border-line bg-white p-6 shadow-pop">
            <h2 className="font-display text-lg font-bold">
              {modal.type === "group-edit" ? "Edit group" : "New group"}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Name</span>
                <input className="input-box py-3 text-sm" value={groupForm.name} onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Slug</span>
                <input className="input-box py-3 text-sm" value={groupForm.slug} onChange={(e) => setGroupForm((f) => ({ ...f, slug: e.target.value }))} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Sort order</span>
                <input type="number" className="input-box py-3 text-sm" value={groupForm.sort_order} onChange={(e) => setGroupForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="cursor-pointer" checked={groupForm.is_active} onChange={(e) => setGroupForm((f) => ({ ...f, is_active: e.target.checked }))} />
                Active
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal({ type: "none" })}>Cancel</button>
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={() => void saveGroup()}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {modal.type === "category-create" || modal.type === "category-edit" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-[24px] border border-line bg-white p-6 shadow-pop">
            <h2 className="font-display text-lg font-bold">
              {modal.type === "category-edit" ? "Edit category" : "New category"}
            </h2>
            {modal.type === "category-edit" && modal.item.is_other ? (
              <p className="mt-2 rounded-[14px] bg-amber-soft px-3 py-2 text-sm text-amber">
                Provider-submitted name. Update it, pick a real group, and uncheck Other to publish it for everyone.
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Group</span>
                <select className="input-box cursor-pointer py-3 text-sm" value={categoryForm.group_id} onChange={(e) => setCategoryForm((f) => ({ ...f, group_id: e.target.value }))}>
                  <option value="">Select group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Name</span>
                <input className="input-box py-3 text-sm" value={categoryForm.name} onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Slug</span>
                <input className="input-box py-3 text-sm" value={categoryForm.slug} onChange={(e) => setCategoryForm((f) => ({ ...f, slug: e.target.value }))} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Emoji or image URL</span>
                <input
                  className="input-box py-3 text-sm"
                  value={categoryForm.emoji}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, emoji: e.target.value }))}
                  placeholder="🔧 or https://..."
                />
                <div className="mt-3 flex items-center gap-3">
                  <ImageOrEmoji value={categoryForm.emoji} alt={categoryForm.name} size={48} />
                  <ImagePreview src={categoryForm.emoji} alt={categoryForm.name} className="max-w-[200px] flex-1" height={80} />
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-ink-soft">Sort order</span>
                <input type="number" className="input-box py-3 text-sm" value={categoryForm.sort_order} onChange={(e) => setCategoryForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="cursor-pointer" checked={categoryForm.is_active} onChange={(e) => setCategoryForm((f) => ({ ...f, is_active: e.target.checked }))} />
                Active
              </label>
              {modal.type === "category-edit" ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" className="cursor-pointer" checked={categoryForm.is_other} onChange={(e) => setIsOther(e.target.checked)} />
                  Other (pending review)
                </label>
              ) : null}
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal({ type: "none" })}>Cancel</button>
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={() => void saveCategory()}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {changeOpen ? (
        <ChangeCategoryModal
          count={selectedIds.size}
          saving={changeSaving}
          error={changeError}
          excludeId={selectedCategory?.id}
          onClose={() => setChangeOpen(false)}
          onSubmit={(id) => void recategorize(id)}
        />
      ) : null}
      </>
      ) : null}
    </div>
  );
}
