import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostalLocality } from "@/lib/geo/postal";

export type CachedLocality = {
  id: string;
  pincode: string;
  name: string;
};

export function mergeLocalities(
  api: PostalLocality[],
  cached: Array<{ id: string; name: string }>,
): PostalLocality[] {
  const byKey = new Map<string, PostalLocality>();

  for (const row of cached) {
    const name = row.name.trim();
    if (!name) continue;
    byKey.set(name.toLowerCase(), {
      name,
      district: null,
      state: null,
      id: row.id,
    });
  }

  for (const row of api) {
    const name = row.name.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = byKey.get(key);
    byKey.set(key, {
      name,
      district: row.district ?? existing?.district ?? null,
      state: row.state ?? existing?.state ?? null,
      id: existing?.id ?? row.id ?? null,
    });
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchCachedLocalities(
  supabase: SupabaseClient,
  pincode: string,
): Promise<CachedLocality[]> {
  const { data, error } = await supabase
    .from("localities")
    .select("id, pincode, name")
    .eq("pincode", pincode)
    .eq("is_active", true)
    .eq("is_deleted", false)
    .order("name");
  if (error) throw error;
  return (data as CachedLocality[]) ?? [];
}
