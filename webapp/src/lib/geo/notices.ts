import type { SupabaseClient } from "@supabase/supabase-js";
import { visible } from "@/lib/db/visible";
import { nestedContentCategory, type ContentCategoryRef } from "@/lib/contentCategories";

export type NoticeDetail = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
  created_at: string | null;
  category: ContentCategoryRef | null;
};

export async function fetchCoveringNoticeIds(
  supabase: SupabaseClient,
  opts: { pincode?: string | null; localityId?: string | null; areaId?: string | null },
): Promise<string[]> {
  const { data, error } = await supabase.rpc("notices_covering", {
    p_pincode: opts.pincode ?? null,
    p_locality_id: opts.localityId ?? null,
    p_area_id: opts.areaId ?? null,
  });
  if (error) throw error;
  return ((data as Array<{ notice_id?: string; id?: string }> | string[] | null) ?? [])
    .map((row) => (typeof row === "string" ? row : row.notice_id ?? row.id))
    .filter((id): id is string => Boolean(id));
}

export async function fetchVisibleNotices(
  supabase: SupabaseClient,
  opts: { pincode?: string | null; localityId?: string | null; areaId?: string | null },
): Promise<NoticeDetail[]> {
  const covering = await fetchCoveringNoticeIds(supabase, opts);
  if (!covering.length) return [];
  const { data } = await visible(
    supabase
      .from("notices")
      .select(
        "id, title, body, image_url, cta_label, cta_url, event_starts_at, event_ends_at, created_at, category:content_categories(id, slug, name, emoji)",
      ),
  )
    .in("id", covering)
    .order("sort_order", { ascending: true });
  return ((data as Array<Omit<NoticeDetail, "category"> & { category?: unknown }> | null) ?? []).map((row) => ({
    ...row,
    category: nestedContentCategory(row.category),
  }));
}

export function formatNoticeDate(iso: string | null) {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
