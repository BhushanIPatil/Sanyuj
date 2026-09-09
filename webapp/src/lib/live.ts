import type { SupabaseClient } from "@supabase/supabase-js";
import { visible } from "@/lib/db/visible";

export const LIVE_SESSION_HOURS = 2;

export type LiveSession = {
  id: string;
  business_id: string;
  pincode: string;
  started_at: string;
  ends_at: string;
};

/** The provider's own live session that has not expired yet, if any. */
export async function fetchActiveLiveSession(
  supabase: SupabaseClient,
  businessId: string,
): Promise<LiveSession | null> {
  const { data, error } = await visible(
    supabase.from("live_sessions").select("id, business_id, pincode, started_at, ends_at"),
  )
    .eq("business_id", businessId)
    .gt("ends_at", new Date().toISOString())
    .order("started_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return ((data as LiveSession[] | null) ?? [])[0] ?? null;
}

export async function startLiveSession(
  supabase: SupabaseClient,
  businessId: string,
  pincode: string,
): Promise<LiveSession> {
  const { data: covers, error: coverErr } = await supabase.rpc("business_covers_pincode", {
    p_business_id: businessId,
    p_pincode: pincode,
  });
  if (coverErr) throw coverErr;
  if (!covers) {
    throw new Error("Add this pincode to your service areas before going live");
  }

  // Only one session should be live at a time, so clear any earlier one first.
  const { error: clearErr } = await supabase
    .from("live_sessions")
    .delete()
    .eq("business_id", businessId);
  if (clearErr) throw clearErr;

  const endsAt = new Date(Date.now() + LIVE_SESSION_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("live_sessions")
    .insert({
      business_id: businessId,
      pincode,
      ends_at: endsAt,
      is_active: true,
      is_deleted: false,
    })
    .select("id, business_id, pincode, started_at, ends_at")
    .single();
  if (error) throw error;
  return data as LiveSession;
}

export async function stopLiveSession(supabase: SupabaseClient, sessionId: string): Promise<void> {
  const { error } = await supabase.from("live_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

export function liveRemainingLabel(endsAt: string): string {
  const left = new Date(endsAt).getTime() - Date.now();
  if (left <= 0) return "Ending now";
  const minutes = Math.floor(left / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `Ends in ${hours}h ${minutes % 60}m`;
  return `Ends in ${Math.max(1, minutes)}m`;
}
