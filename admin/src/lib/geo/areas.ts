import type { SupabaseClient } from "@supabase/supabase-js";

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
