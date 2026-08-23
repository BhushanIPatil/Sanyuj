import type { SupabaseClient } from "@supabase/supabase-js";

export type CategoryGroup = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  /** Emoji character, or an image URL shown in place of the icon. */
  emoji: string | null;
  group_id: string;
  sort_order: number;
};

/** True when the categories.emoji field holds an image URL. */
export function isCategoryImageUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^(https?:\/\/|\/\/|\/|data:image\/)/i.test(value.trim());
}

export type CategoryTreeGroup = CategoryGroup & {
  categories: Category[];
};

type CategoryRow = Category & {
  category_groups: CategoryGroup | CategoryGroup[] | null;
};

function asGroup(raw: CategoryRow["category_groups"]): CategoryGroup | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

/** Active super + sub categories for UI pickers (dashboard-managed). */
export async function fetchCategoryTree(
  supabase: SupabaseClient,
): Promise<CategoryTreeGroup[]> {
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, slug, name, emoji, group_id, sort_order, category_groups!inner(id, slug, name, sort_order, is_active, is_deleted)",
    )
    .eq("is_active", true)
    .eq("is_deleted", false)
    .eq("category_groups.is_active", true)
    .eq("category_groups.is_deleted", false)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  const byGroup = new Map<string, CategoryTreeGroup>();

  for (const row of (data ?? []) as CategoryRow[]) {
    const group = asGroup(row.category_groups);
    if (!group) continue;

    let entry = byGroup.get(group.id);
    if (!entry) {
      entry = { ...group, categories: [] };
      byGroup.set(group.id, entry);
    }
    entry.categories.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      emoji: row.emoji,
      group_id: row.group_id,
      sort_order: row.sort_order,
    });
  }

  return Array.from(byGroup.values())
    .map((g) => ({
      ...g,
      categories: g.categories.sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function flattenCategories(tree: CategoryTreeGroup[]): Category[] {
  return tree.flatMap((g) => g.categories);
}

export function categoryDisplayName(
  cat: { name?: string | null; slug?: string | null } | string | null | undefined,
): string {
  if (!cat) return "";
  if (typeof cat === "string") return cat;
  return cat.name ?? cat.slug ?? "";
}
