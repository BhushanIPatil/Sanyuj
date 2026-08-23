import type { SupabaseClient } from "@supabase/supabase-js";
import { visible } from "@/lib/db/visible";

export type FinalizeDealOptions = {
  /** When set, both budget_min and budget_max are saved to this final amount. */
  finalAmount?: number | null;
};

/**
 * Close a job and record the deal outcome on job_interests.status:
 * - winner interest → `selected`
 * - other interests → `closed`
 * - no provider → all non-withdrawn interests → `closed`
 *
 * Sets jobs.closed_with_business_id to the winning business (or null).
 * Optionally locks budget_min/budget_max to the same final amount.
 */
export async function finalizeJobDeal(
  supabase: SupabaseClient,
  jobId: string,
  selectedInterestId: string | null,
  options: FinalizeDealOptions = {},
): Promise<void> {
  let businessId: string | null = null;

  if (selectedInterestId) {
    const { data: interest, error: lookupErr } = await visible(
      supabase.from("job_interests").select("business_id"),
    )
      .eq("id", selectedInterestId)
      .eq("job_id", jobId)
      .single();
    if (lookupErr) throw lookupErr;
    businessId = interest?.business_id ?? null;
  }

  const jobUpdate: {
    status: "closed";
    closed_with_business_id: string | null;
    budget_min?: number;
    budget_max?: number;
  } = {
    status: "closed",
    closed_with_business_id: businessId,
  };

  if (options.finalAmount != null && Number.isFinite(options.finalAmount) && options.finalAmount >= 0) {
    const amount = Math.round(options.finalAmount);
    jobUpdate.budget_min = amount;
    jobUpdate.budget_max = amount;
  }

  const { error: jobErr } = await visible(supabase.from("jobs").update(jobUpdate)).eq("id", jobId);
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
  const { error: jobErr } = await visible(
    supabase.from("jobs").update({
      status: "open",
      closed_with_business_id: null,
    }),
  ).eq("id", jobId);
  if (jobErr) throw jobErr;

  const { error: intErr } = await visible(
    supabase.from("job_interests").update({ status: "waiting" }),
  )
    .eq("job_id", jobId)
    .in("status", ["selected", "closed"]);
  if (intErr) throw intErr;
}
