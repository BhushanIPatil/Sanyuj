"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImagePreview } from "@/components/ui/ImageOrEmoji";

export type ProviderFormValues = {
  name: string;
  category_id: string;
  photo_url: string;
  status: "active" | "inactive" | "deleted";
};

type CategoryOption = {
  id: string;
  name: string;
  group: string;
};

export function ProviderFormModal({
  initial,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  initial: ProviderFormValues;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: ProviderFormValues) => void;
}) {
  const [form, setForm] = useState(initial);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("categories")
        .select("id, name, sort_order, is_other, is_deleted, category_groups(name, sort_order)")
        .eq("is_deleted", false)
        .order("sort_order");
      const rows =
        (data as unknown as Array<{
          id: string;
          name: string;
          sort_order: number;
          is_other: boolean;
          category_groups:
            | { name: string; sort_order: number }
            | { name: string; sort_order: number }[]
            | null;
        }> | null) ?? [];
      setCategories(
        [...rows]
          .map((c) => {
            const group = Array.isArray(c.category_groups) ? (c.category_groups[0] ?? null) : c.category_groups;
            return {
              id: c.id,
              name: c.name,
              sort_order: c.sort_order,
              group: c.is_other ? "Other (pending)" : (group?.name ?? "Other"),
              groupOrder: c.is_other ? 999 : (group?.sort_order ?? 0),
            };
          })
          .sort((a, b) => {
            const g = a.groupOrder - b.groupOrder;
            if (g !== 0) return g;
            return a.sort_order - b.sort_order;
          })
          .map((c) => ({
            id: c.id,
            name: c.name,
            group: c.group,
          })),
      );
    };
    void load();
  }, []);

  const groups = [...new Set(categories.map((c) => c.group))];

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ink/40 p-4">
      <form
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-line bg-white shadow-pop"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-bold">Edit business</h2>
          <p className="mt-1 text-sm text-ink-soft">Update listing details and whether neighbours can find this provider.</p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Business name</span>
            <input
              required
              className="input-box py-3 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Category</span>
            <select
              required
              className="input-box py-3 text-sm"
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            >
              <option value="">Select a category</option>
              {groups.map((group) => (
                <optgroup key={group} label={group}>
                  {categories
                    .filter((c) => c.group === group)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Photo URL</span>
            <input
              className="input-box py-3 text-sm"
              value={form.photo_url}
              onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
              placeholder="https://..."
            />
            <ImagePreview src={form.photo_url} alt={form.name} className="mt-3" height={140} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Status</span>
            <select
              className="input-box py-3 text-sm"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProviderFormValues["status"] }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="deleted">Deleted</option>
            </select>
          </label>
          {error ? <p className="text-sm font-semibold text-rose">{error}</p> : null}
        </div>
        <div className="flex gap-3 border-t border-line px-6 py-4">
          <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1 !w-auto py-3" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
