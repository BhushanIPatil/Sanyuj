"use client";

import { Plus, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ImageOrEmoji, ImagePreview } from "@/components/ui/ImageOrEmoji";
import { CategoriesPageSkeleton } from "@/components/ui/Skeleton";

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
  category_groups: { name: string } | null;
};

type ModalMode =
  | { type: "none" }
  | { type: "group-create" }
  | { type: "group-edit"; item: CategoryGroup }
  | { type: "category-create" }
  | { type: "category-edit"; item: Category };

export default function CategoriesPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>({ type: "none" });
  const [saving, setSaving] = useState(false);

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
  });

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [groupsRes, catsRes] = await Promise.all([
      supabase.from("category_groups").select("*").order("sort_order"),
      supabase
        .from("categories")
        .select("*, category_groups(name)")
        .order("sort_order"),
    ]);
    setGroups((groupsRes.data as CategoryGroup[]) ?? []);
    setCategories((catsRes.data as unknown as Category[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    setSaving(true);
    const supabase = createClient();
    const payload = {
      group_id: categoryForm.group_id,
      slug: categoryForm.slug.trim().toLowerCase().replace(/\s+/g, "_"),
      name: categoryForm.name.trim(),
      emoji: categoryForm.emoji.trim() || null,
      sort_order: categoryForm.sort_order,
      is_active: categoryForm.is_active,
    };

    if (modal.type === "category-edit") {
      const { error } = await supabase.from("categories").update(payload).eq("id", modal.item.id);
      if (error) showToast(error.message);
      else showToast("Category updated");
    } else {
      const { error } = await supabase.from("categories").insert(payload);
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
    const ok = await confirm({
      title: "Delete category?",
      message: `This will permanently remove "${cat.name}".`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", cat.id);
    if (error) showToast(error.message);
    else {
      showToast("Category deleted");
      void load();
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
      group_id: groups[0]?.id ?? "",
      slug: "",
      name: "",
      emoji: "",
      sort_order: categories.length + 1,
      is_active: true,
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
    });
    setModal({ type: "category-edit", item });
  };

  if (loading) return <CategoriesPageSkeleton />;

  return (
    <div className="page-pad">
      <PageHeader title="Categories" />

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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Categories</h2>
          <button type="button" onClick={openCategoryCreate} className="btn-secondary inline-flex w-auto items-center gap-2 py-2 text-sm">
            <Plus size={14} />
            New category
          </button>
        </div>
        <DataTable
          rows={categories}
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
              render: (r) => <span className="font-semibold">{r.name}</span>,
            },
            { key: "group", header: "Group", sortValue: (r) => r.category_groups?.name ?? "", render: (r) => <span>{r.category_groups?.name ?? "—"}</span> },
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
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal({ type: "none" })}>Cancel</button>
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={() => void saveCategory()}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
