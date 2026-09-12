import type { SupabaseClient } from "@supabase/supabase-js";
import {
  groupAdCoverage,
  summarizeAdPin,
  type AdCoverageRow,
  type AdPinDraft,
} from "@/lib/geo/adCoverage";

export { groupAdCoverage as groupServiceCoverage, summarizeAdPin as summarizeServicePin };
export type { AdPinDraft as ServicePinDraft };

export async function fetchServiceCoverage(
  supabase: SupabaseClient,
  serviceId: string,
): Promise<AdCoverageRow[]> {
  const { data, error } = await supabase
    .from("service_coverage")
    .select("id, service_id, pincode, locality_id, area_id, localities(id, name), areas(id, name)")
    .eq("service_id", serviceId)
    .eq("is_deleted", false)
    .order("pincode");
  if (error) throw error;
  const raw =
    (data as unknown as Array<{
      id: string;
      service_id: string;
      pincode: string;
      locality_id: string | null;
      area_id: string | null;
      localities: { id: string; name: string } | { id: string; name: string }[] | null;
      areas: { id: string; name: string } | { id: string; name: string }[] | null;
    }> | null) ?? [];
  return raw.map((r) => ({
    id: r.id,
    ad_id: r.service_id,
    pincode: r.pincode,
    locality_id: r.locality_id,
    area_id: r.area_id,
    localities: Array.isArray(r.localities) ? (r.localities[0] ?? null) : r.localities,
    areas: Array.isArray(r.areas) ? (r.areas[0] ?? null) : r.areas,
  }));
}

export async function saveServiceCoverage(
  supabase: SupabaseClient,
  serviceId: string,
  nationwide: boolean,
  pins: AdPinDraft[],
): Promise<void> {
  const { data: existing, error: existingErr } = await supabase
    .from("service_coverage")
    .select("pincode")
    .eq("service_id", serviceId)
    .eq("is_deleted", false);
  if (existingErr) throw existingErr;
  const existingPins = [...new Set((existing ?? []).map((r: { pincode: string }) => r.pincode))];

  if (nationwide) {
    if (existingPins.length) {
      const { error } = await supabase.from("service_coverage").delete().eq("service_id", serviceId);
      if (error) throw error;
    }
    return;
  }

  const nextPins = new Set(pins.map((p) => p.pincode));
  for (const pin of existingPins) {
    if (nextPins.has(pin)) continue;
    const { error } = await supabase
      .from("service_coverage")
      .delete()
      .eq("service_id", serviceId)
      .eq("pincode", pin);
    if (error) throw error;
  }

  for (const pin of pins) {
    const { error } = await supabase.rpc("replace_service_pincode_coverage", {
      p_service_id: serviceId,
      p_pincode: pin.pincode,
      p_mode: pin.whole ? "whole" : "precise",
      p_items: pin.items.map((item) => ({
        locality_name: item.localityName,
        entire_locality: item.entireLocality,
        area_ids: item.areaIds,
      })),
    });
    if (error) throw error;
  }
}
