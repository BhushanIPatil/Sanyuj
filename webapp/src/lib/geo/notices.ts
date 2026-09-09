import type { SupabaseClient } from "@supabase/supabase-js";
import { visible } from "@/lib/db/visible";

export type NoticeDetail = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
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
    supabase.from("notices").select("id, title, body, image_url, starts_at, ends_at, created_at"),
  )
    .in("id", covering)
    .order("sort_order", { ascending: true });
  return (data as NoticeDetail[] | null) ?? [];
}

export type ProfileGeo = {
  pincode: string | null;
  locality: string | null;
  localityId: string | null;
  area: string | null;
  areaId: string | null;
};

const EMPTY_PROFILE_GEO: ProfileGeo = {
  pincode: null,
  locality: null,
  localityId: null,
  area: null,
  areaId: null,
};

export async function fetchProfileGeo(supabase: SupabaseClient): Promise<ProfileGeo> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_PROFILE_GEO;
  const { data } = await visible(
    supabase.from("profiles").select("pincode, locality, locality_id, area, area_id"),
  )
    .eq("id", user.id)
    .maybeSingle();
  return {
    pincode: data?.pincode ?? null,
    locality: data?.locality ?? null,
    localityId: data?.locality_id ?? null,
    area: data?.area ?? null,
    areaId: data?.area_id ?? null,
  };
}

export function formatNoticeDate(iso: string | null) {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
