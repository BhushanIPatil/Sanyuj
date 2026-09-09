import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { nestedContentCategory, type ContentCategoryRef } from "@/lib/contentCategories";

export async function fetchCoveringAdIds(
  supabase: SupabaseClient,
  opts: { pincode?: string | null; localityId?: string | null; areaId?: string | null },
): Promise<string[]> {
  const { data, error } = await supabase.rpc("ads_covering", {
    p_pincode: opts.pincode ?? null,
    p_locality_id: opts.localityId ?? null,
    p_area_id: opts.areaId ?? null,
  });
  if (error) throw error;
  return ((data as Array<{ ad_id?: string; id?: string }> | string[] | null) ?? [])
    .map((row) => (typeof row === "string" ? row : row.ad_id ?? row.id))
    .filter((id): id is string => Boolean(id));
}

export type AdDetail = {
  id: string;
  brand_name: string;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  background: string | null;
  offer_starts_at: string | null;
  offer_ends_at: string | null;
  created_at: string | null;
  category: ContentCategoryRef | null;
};

const AD_SELECT =
  "id, brand_name, title, body, cta_label, cta_url, image_url, background, offer_starts_at, offer_ends_at, created_at, category:content_categories(id, slug, name, emoji)";

export async function fetchVisibleAds(
  supabase: SupabaseClient,
  opts: {
    pincode?: string | null;
    localityId?: string | null;
    areaId?: string | null;
    homeScreenOnly?: boolean;
    limit?: number;
  },
): Promise<AdDetail[]> {
  const covering = await fetchCoveringAdIds(supabase, opts);
  if (!covering.length) return [];
  let query = supabase
    .from("ads")
    .select(AD_SELECT)
    .eq("is_active", true)
    .eq("is_deleted", false)
    .in("id", covering);
  if (opts.homeScreenOnly) query = query.eq("is_home_screen", true);
  const ordered = query.order("sort_order", { ascending: true });
  const { data } = await (opts.limit != null ? ordered.limit(opts.limit) : ordered);
  return ((data as Array<Omit<AdDetail, "category"> & { category?: unknown }> | null) ?? []).map((row) => ({
    ...row,
    category: nestedContentCategory(row.category),
  }));
}

export async function recordAdClick(adId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  try {
    await supabase.rpc("record_ad_click", { p_ad_id: adId });
  } catch {
    /* non-blocking */
  }
}

/** Home carousel: ~220px tall — use images that fit fully (object-contain). */
export const AD_BANNER_HEIGHT = 220;
export const AD_BANNER_RADIUS = 12;
export const AD_BANNER_ASPECT = "2.4 / 1";
export const AD_CAROUSEL_MS = 2000;

export function formatAdDate(iso: string | null) {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
