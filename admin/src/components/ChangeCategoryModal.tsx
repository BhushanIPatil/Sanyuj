"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CategoryOption = {
  id: string;
  name: string;
  group: string;
  is_other: boolean;
};

export function ChangeCategoryModal({
  count,
  saving,
  error,
  excludeId,
  onClose,
  onSubmit,
}: {
  count: number;
  saving: boolean;
  error: string;
  excludeId?: string;
  onClose: () => void;
  onSubmit: (categoryId: string) => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("categories")
        .select("id, name, sort_order, is_other, is_deleted, category_groups(name, sort_order, slug)")
        .eq("is_deleted", false)
        .order("sort_order");
      const rows =
        (data as unknown as Array<{
          id: string;
          name: string;
          sort_order: number;
          is_other: boolean;
          category_groups:
            | { name: string; sort_order: number; slug: string }
            | { name: string; sort_order: number; slug: string }[]
            | null;
        }> | null) ?? [];
      setCategories(
        [...rows]
          .filter((c) => c.id !== excludeId)
          .map((c) => {
            const group = Array.isArray(c.category_groups) ? (c.category_groups[0] ?? null) : c.category_groups;
            return {
              id: c.id,
              name: c.name,
              sort_order: c.sort_order,
              is_other: c.is_other,
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
            is_other: c.is_other,
          })),
      );
    };
    void load();
  }, [excludeId]);

  const groups = [...new Set(categories.map((c) => c.group))];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4">
      <form
        className="w-full max-w-md rounded-[24px] border border-line bg-white p-6 shadow-pop"
        onSubmit={(e) => {
          e.preventDefault();
          if (!categoryId) return;
          onSubmit(categoryId);
        }}
      >
        <h2 className="font-display text-lg font-bold">Change category</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Move {count} selected {count === 1 ? "business" : "businesses"} to another category.
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-bold text-ink-soft">New category</span>
          <select
            required
            className="input-box py-3 text-sm"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
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
        {error ? <p className="mt-3 text-sm font-semibold text-rose">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1 !w-auto py-3" disabled={saving || !categoryId}>
            {saving ? "Saving…" : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
