import type { SupabaseClient } from "@supabase/supabase-js";

/** Sentinel value for the "Other" chip on business setup. */
export const OTHER_CATEGORY_VALUE = "__other__";
/** Browse/filter slug for every pending custom category. */
export const OTHER_CATEGORY_SLUG = "other";

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
  is_other?: boolean;
};

/** Shown on home/explore so neighbours can find listings that are still pending review. */
export const OTHER_BROWSE_CATEGORY: Category = {
  id: OTHER_CATEGORY_VALUE,
  slug: OTHER_CATEGORY_SLUG,
  name: "Other",
  emoji: "✨",
  group_id: "",
  sort_order: 999,
  is_other: true,
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
      "id, slug, name, emoji, group_id, sort_order, is_other, category_groups!inner(id, slug, name, sort_order, is_active, is_deleted)",
    )
    .eq("is_active", true)
    .eq("is_deleted", false)
    .eq("is_other", false)
    .eq("category_groups.is_active", true)
    .eq("category_groups.is_deleted", false)
    .neq("category_groups.slug", "other")
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
      is_other: false,
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

export function matchesCategoryFilter(
  cat: { slug?: string | null; is_other?: boolean | null } | null | undefined,
  slugs: string[],
): boolean {
  if (!slugs.length) return true;
  const wantsOther = slugs.includes(OTHER_CATEGORY_SLUG);
  const official = slugs.filter((s) => s !== OTHER_CATEGORY_SLUG);
  if (official.includes(cat?.slug ?? "")) return true;
  return wantsOther && Boolean(cat?.is_other);
}

/** Resolve a picker value to a categories.id, creating a pending Other row when needed. */
export async function resolveCategoryId(
  supabase: SupabaseClient,
  selectedId: string | null,
  customName: string,
): Promise<string> {
  if (!selectedId) throw new Error("Select a category");
  if (selectedId !== OTHER_CATEGORY_VALUE) return selectedId;
  const name = customName.trim();
  if (name.length < 2) throw new Error("Enter your category name");
  const { data, error } = await supabase.rpc("create_other_category", { p_name: name });
  if (error) throw error;
  const id = typeof data === "string" ? data : null;
  if (!id) throw new Error("Could not save category");
  return id;
}
