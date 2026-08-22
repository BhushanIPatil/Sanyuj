import type { SupabaseClient } from "@supabase/supabase-js";
import { visible } from "@/lib/db/visible";

/**
 * Close a job and record the deal outcome on job_interests.status:
 * - winner interest → `selected`
 * - other interests → `closed`
 * - no provider → all non-withdrawn interests → `closed`
 */
export async function finalizeJobDeal(
  supabase: SupabaseClient,
  jobId: string,
  selectedInterestId: string | null,
): Promise<void> {
  const { error: jobErr } = await visible(supabase.from("jobs").update({ status: "closed" })).eq(
    "id",
    jobId,
  );
  if (jobErr) throw jobErr;

  if (selectedInterestId) {
    const { error: winErr } = await visible(
      supabase.from("job_interests").update({ status: "selected" }),
    )
      .eq("id", selectedInterestId)
      .eq("job_id", jobId);
    if (winErr) throw winErr;

    const { error: loseErr } = await visible(
      supabase.from("job_interests").update({ status: "closed" }),
    )
      .eq("job_id", jobId)
      .neq("id", selectedInterestId)
      .neq("status", "withdrawn");
    if (loseErr) throw loseErr;
    return;
  }

  const { error: allErr } = await visible(
    supabase.from("job_interests").update({ status: "closed" }),
  )
    .eq("job_id", jobId)
    .neq("status", "withdrawn");
  if (allErr) throw allErr;
}

/** Re-open a job and reset deal outcomes back to waiting. */
export async function reopenJob(supabase: SupabaseClient, jobId: string): Promise<void> {
  const { error: jobErr } = await visible(supabase.from("jobs").update({ status: "open" })).eq(
    "id",
    jobId,
  );
  if (jobErr) throw jobErr;

  const { error: intErr } = await visible(
    supabase.from("job_interests").update({ status: "waiting" }),
  )
    .eq("job_id", jobId)
    .in("status", ["selected", "closed"]);
  if (intErr) throw intErr;
}
