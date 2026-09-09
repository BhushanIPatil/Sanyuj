import type { SupabaseClient } from "@supabase/supabase-js";
import {
  groupAdCoverage,
  summarizeAdPin,
  type AdCoverageRow,
  type AdPinDraft,
} from "@/lib/geo/adCoverage";

export { groupAdCoverage as groupNoticeCoverage, summarizeAdPin as summarizeNoticePin };
export type { AdPinDraft as NoticePinDraft };

export async function fetchNoticeCoverage(
  supabase: SupabaseClient,
  noticeId: string,
): Promise<AdCoverageRow[]> {
  const { data, error } = await supabase
    .from("notice_service_areas")
    .select("id, notice_id, pincode, locality_id, area_id, localities(id, name), areas(id, name)")
    .eq("notice_id", noticeId)
    .eq("is_deleted", false)
    .order("pincode");
  if (error) throw error;
  const raw =
    (data as unknown as Array<{
      id: string;
      notice_id: string;
      pincode: string;
      locality_id: string | null;
      area_id: string | null;
      localities: { id: string; name: string } | { id: string; name: string }[] | null;
      areas: { id: string; name: string } | { id: string; name: string }[] | null;
    }> | null) ?? [];
  return raw.map((r) => ({
    id: r.id,
    ad_id: r.notice_id,
    pincode: r.pincode,
    locality_id: r.locality_id,
    area_id: r.area_id,
    localities: Array.isArray(r.localities) ? (r.localities[0] ?? null) : r.localities,
    areas: Array.isArray(r.areas) ? (r.areas[0] ?? null) : r.areas,
  }));
}

export async function saveNoticeCoverage(
  supabase: SupabaseClient,
  noticeId: string,
  nationwide: boolean,
  pins: AdPinDraft[],
): Promise<void> {
  const { data: existing, error: existingErr } = await supabase
    .from("notice_service_areas")
    .select("pincode")
    .eq("notice_id", noticeId)
    .eq("is_deleted", false);
  if (existingErr) throw existingErr;
  const existingPins = [...new Set((existing ?? []).map((r: { pincode: string }) => r.pincode))];

  if (nationwide) {
    if (existingPins.length) {
      const { error } = await supabase.from("notice_service_areas").delete().eq("notice_id", noticeId);
      if (error) throw error;
    }
    return;
  }

  const nextPins = new Set(pins.map((p) => p.pincode));
  for (const pin of existingPins) {
    if (nextPins.has(pin)) continue;
    const { error } = await supabase
      .from("notice_service_areas")
      .delete()
      .eq("notice_id", noticeId)
      .eq("pincode", pin);
    if (error) throw error;
  }

  for (const pin of pins) {
    const { error } = await supabase.rpc("replace_notice_pincode_coverage", {
      p_notice_id: noticeId,
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
