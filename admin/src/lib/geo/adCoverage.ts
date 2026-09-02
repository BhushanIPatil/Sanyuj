import type { SupabaseClient } from "@supabase/supabase-js";

export type AdCoverageRow = {
  id: string;
  ad_id: string;
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

export type AdPinDraft = {
  pincode: string;
  whole: boolean;
  items: PreciseCoverageItem[];
};

export function groupAdCoverage(rows: AdCoverageRow[]): AdPinDraft[] {
  const map = new Map<string, AdCoverageRow[]>();
  for (const row of rows) {
    const list = map.get(row.pincode) ?? [];
    list.push(row);
    map.set(row.pincode, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pincode, list]) => {
      const whole = list.some((r) => !r.locality_id && !r.area_id);
      const items: PreciseCoverageItem[] = [];
      if (!whole) {
        const byName = new Map<string, PreciseCoverageItem>();
        for (const row of list) {
          const name = row.localities?.name;
          if (!name) continue;
          const cur = byName.get(name) ?? {
            localityName: name,
            entireLocality: !row.area_id,
            areaIds: [],
          };
          if (row.area_id) {
            cur.entireLocality = false;
            cur.areaIds = [...cur.areaIds, row.area_id];
          } else {
            cur.entireLocality = true;
            cur.areaIds = [];
          }
          byName.set(name, cur);
        }
        items.push(...byName.values());
      }
      return { pincode, whole, items };
    });
}

export function summarizeAdPin(pin: AdPinDraft): string {
  if (pin.whole) return "Entire pincode";
  return (
    pin.items
      .map((item) =>
        item.entireLocality || !item.areaIds.length
          ? `${item.localityName} (all)`
          : `${item.localityName} (${item.areaIds.length} area${item.areaIds.length === 1 ? "" : "s"})`,
      )
      .join(", ") || "Selected localities"
  );
}

export async function fetchAdCoverage(
  supabase: SupabaseClient,
  adId: string,
): Promise<AdCoverageRow[]> {
  const { data, error } = await supabase
    .from("ad_service_areas")
    .select("id, ad_id, pincode, locality_id, area_id, localities(id, name), areas(id, name)")
    .eq("ad_id", adId)
    .eq("is_deleted", false)
    .order("pincode");
  if (error) throw error;
  return (data as unknown as AdCoverageRow[]) ?? [];
}

export async function saveAdCoverage(
  supabase: SupabaseClient,
  adId: string,
  nationwide: boolean,
  pins: AdPinDraft[],
): Promise<void> {
  const { data: existing, error: existingErr } = await supabase
    .from("ad_service_areas")
    .select("pincode")
    .eq("ad_id", adId)
    .eq("is_deleted", false);
  if (existingErr) throw existingErr;
  const existingPins = [...new Set((existing ?? []).map((r: { pincode: string }) => r.pincode))];

  if (nationwide) {
    if (existingPins.length) {
      const { error } = await supabase.from("ad_service_areas").delete().eq("ad_id", adId);
      if (error) throw error;
    }
    return;
  }

  const nextPins = new Set(pins.map((p) => p.pincode));
  for (const pin of existingPins) {
    if (nextPins.has(pin)) continue;
    const { error } = await supabase
      .from("ad_service_areas")
      .delete()
      .eq("ad_id", adId)
      .eq("pincode", pin);
    if (error) throw error;
  }

  for (const pin of pins) {
    const { error } = await supabase.rpc("replace_ad_pincode_coverage", {
      p_ad_id: adId,
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
