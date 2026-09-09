import type { SupabaseClient } from "@supabase/supabase-js";
import { visible } from "@/lib/db/visible";

export type CoverageRow = {
  id: string;
  business_id: string;
  pincode: string;
  locality_id: string | null;
  area_id: string | null;
  localities: { id: string; name: string } | null;
  areas: { id: string; name: string } | null;
};

export type PreciseCoverageItem = {
  localityName: string;
  entireLocality: boolean;
  areaIds: string[];
};

export async function fetchCoveringBusinessIds(
  supabase: SupabaseClient,
  opts: { pincode: string; localityId?: string | null; areaId?: string | null },
): Promise<string[]> {
  const { data, error } = await supabase.rpc("businesses_covering", {
    p_pincode: opts.pincode,
    p_locality_id: opts.localityId ?? null,
    p_area_id: opts.areaId ?? null,
  });
  if (error) throw error;
  return ((data as Array<{ business_id?: string }> | string[] | null) ?? [])
    .map((row) => (typeof row === "string" ? row : row.business_id))
    .filter((id): id is string => Boolean(id));
}

export async function businessCoversPincode(
  supabase: SupabaseClient,
  businessId: string,
  pincode: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("business_covers_pincode", {
    p_business_id: businessId,
    p_pincode: pincode,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function fetchBusinessCoverage(
  supabase: SupabaseClient,
  businessId: string,
): Promise<CoverageRow[]> {
  const { data, error } = await visible(
    supabase
      .from("business_service_areas")
      .select("id, business_id, pincode, locality_id, area_id, localities(id, name), areas(id, name)"),
  )
    .eq("business_id", businessId)
    .order("pincode");
  if (error) throw error;
  return (data as unknown as CoverageRow[]) ?? [];
}

export async function savePincodeCoverage(
  supabase: SupabaseClient,
  businessId: string,
  pincode: string,
  mode: "whole" | "precise",
  items: PreciseCoverageItem[] = [],
): Promise<void> {
  const { error } = await supabase.rpc("replace_pincode_coverage", {
    p_business_id: businessId,
    p_pincode: pincode,
    p_mode: mode,
    p_items: items.map((item) => ({
      locality_name: item.localityName,
      entire_locality: item.entireLocality,
      area_ids: item.areaIds,
    })),
  });
  if (error) throw error;
}
