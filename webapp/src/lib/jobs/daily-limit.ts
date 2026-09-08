import type { SupabaseClient } from "@supabase/supabase-js";

export const JOB_DAILY_LIMIT_MESSAGE =
  "You can only post one job per day. Try again tomorrow.";

export const JOB_DAILY_LIMIT_CODE = "JOB_DAILY_LIMIT";

/** Start/end of the current Asia/Kolkata calendar day as UTC ISO strings. */
export function istDayBounds(now = new Date()): { startIso: string; endIso: string; day: string } {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const start = new Date(`${day}T00:00:00+05:30`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { startIso: start.toISOString(), endIso: end.toISOString(), day };
}

/** True if the user already posted a job today (IST), including soft-deleted. */
export async function hasPostedJobToday(
  admin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { startIso, endIso } = istDayBounds();
  const { count, error } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", userId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (error) throw error;
  return (count ?? 0) >= 1;
}

export function isJobDailyLimitError(message: string | undefined | null): boolean {
  if (!message) return false;
  return (
    message.includes(JOB_DAILY_LIMIT_MESSAGE) ||
    message.toLowerCase().includes("one job per day")
  );
}
