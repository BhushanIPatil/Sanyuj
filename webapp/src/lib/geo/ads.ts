import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

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
};

export function formatAdDate(iso: string | null) {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
