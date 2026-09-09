import type { SupabaseClient } from "@supabase/supabase-js";
import { visible } from "@/lib/db/visible";

export type ContentCategoryKind = "offer" | "notice";

export type ContentCategory = {
  id: string;
  kind: ContentCategoryKind;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
};

export type ContentCategoryRef = Pick<ContentCategory, "id" | "slug" | "name" | "emoji">;

/** Active categories for Offerly (`offer`) or Notify (`notice`). */
export async function fetchContentCategories(
  supabase: SupabaseClient,
  kind: ContentCategoryKind,
): Promise<ContentCategory[]> {
  const { data, error } = await visible(
    supabase.from("content_categories").select("id, kind, slug, name, emoji, sort_order"),
  )
    .eq("kind", kind)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as ContentCategory[] | null) ?? [];
}

/** Flattens a PostgREST nested `category:content_categories(...)` embed. */
export function nestedContentCategory(raw: unknown): ContentCategoryRef | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  return {
    id: o.id,
    slug: typeof o.slug === "string" ? o.slug : "",
    name: typeof o.name === "string" ? o.name : "",
    emoji: typeof o.emoji === "string" ? o.emoji : null,
  };
}
