import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveLocalityId } from "@/lib/geo/localities";

export type AreaOption = {
  id: string;
  locality_id: string;
  name: string;
};

export async function fetchAreasForLocality(
  supabase: SupabaseClient,
  localityId: string,
): Promise<AreaOption[]> {
  const { data, error } = await supabase
    .from("areas")
    .select("id, locality_id, name")
    .eq("locality_id", localityId)
    .eq("is_active", true)
    .eq("is_deleted", false)
    .order("name");
  if (error) throw error;
  return (data as AreaOption[]) ?? [];
}

export async function assertAreaIfRequired(
  supabase: SupabaseClient,
  pincode: string,
  locality: string,
  areaId?: string | null,
): Promise<void> {
  const localityId = await resolveLocalityId(supabase, pincode, locality);
  if (!localityId) return;
  const areas = await fetchAreasForLocality(supabase, localityId);
  if (areas.length > 0 && !areaId) {
    throw new Error("Select your area / colony");
  }
}
