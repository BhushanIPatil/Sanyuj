import type { SupabaseClient } from "@supabase/supabase-js";

const ACCOUNT_DELETED = { is_active: false, is_deleted: true } as const;
const ACCOUNT_ACTIVE = { is_active: true, is_deleted: false } as const;

async function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function assertBusinessMatchesJobCategory(
  admin: SupabaseClient,
  jobId: string,
  businessId: string,
): Promise<void> {
  const { data: job, error: jobErr } = await admin
    .from("jobs")
    .select("category_id")
    .eq("id", jobId)
    .single();
  throwIfError(jobErr);
  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .select("category_id")
    .eq("id", businessId)
    .single();
  throwIfError(bizErr);
  if (job?.category_id && biz?.category_id && job.category_id !== biz.category_id) {
    throw new Error("Provider must be in the same category as the job");
  }
}

export async function ensureInterest(
  admin: SupabaseClient,
  jobId: string,
  businessId: string,
): Promise<string> {
  await assertBusinessMatchesJobCategory(admin, jobId, businessId);

  const { data: existing, error: lookupErr } = await admin
    .from("job_interests")
    .select("id, status, is_deleted")
    .eq("job_id", jobId)
    .eq("business_id", businessId)
    .maybeSingle();
  throwIfError(lookupErr);

  if (existing?.id) {
    if (existing.is_deleted || existing.status === "withdrawn") {
      const { error } = await admin
        .from("job_interests")
        .update({ ...ACCOUNT_ACTIVE, status: "waiting" })
        .eq("id", existing.id);
      throwIfError(error);
    }
    return existing.id as string;
  }

  const { data: inserted, error: insertErr } = await admin
    .from("job_interests")
    .insert({
      job_id: jobId,
      business_id: businessId,
      status: "waiting",
      is_active: true,
      is_deleted: false,
    })
    .select("id")
    .single();
  throwIfError(insertErr);
  if (!inserted?.id) throw new Error("Could not assign provider interest");
  return inserted.id as string;
}

export async function finalizeJobDeal(
  admin: SupabaseClient,
  jobId: string,
  selectedInterestId: string | null,
  finalAmount?: number | null,
): Promise<void> {
  let businessId: string | null = null;

  if (selectedInterestId) {
    const { data: interest, error: lookupErr } = await admin
      .from("job_interests")
      .select("business_id")
      .eq("id", selectedInterestId)
      .eq("job_id", jobId)
      .single();
    throwIfError(lookupErr);
    businessId = (interest?.business_id as string | null) ?? null;
    if (businessId) {
      await assertBusinessMatchesJobCategory(admin, jobId, businessId);
    }
  }

  const jobUpdate: {
    status: "closed";
    closed_with_business_id: string | null;
    is_active: boolean;
    is_deleted: boolean;
    budget_min?: number;
    budget_max?: number;
  } = {
    status: "closed",
    closed_with_business_id: businessId,
    is_active: true,
    is_deleted: false,
  };

  if (finalAmount != null && Number.isFinite(finalAmount) && finalAmount >= 0) {
    const amount = Math.round(finalAmount);
    jobUpdate.budget_min = amount;
    jobUpdate.budget_max = amount;
  }

  const { error: jobErr } = await admin.from("jobs").update(jobUpdate).eq("id", jobId);
  throwIfError(jobErr);

  if (selectedInterestId) {
    const { error: winErr } = await admin
      .from("job_interests")
      .update({ status: "selected", ...ACCOUNT_ACTIVE })
      .eq("id", selectedInterestId)
      .eq("job_id", jobId);
    throwIfError(winErr);

    const { error: loseErr } = await admin
      .from("job_interests")
      .update({ status: "closed" })
      .eq("job_id", jobId)
      .neq("id", selectedInterestId)
      .neq("status", "withdrawn");
    throwIfError(loseErr);
    return;
  }

  const { error: allErr } = await admin
    .from("job_interests")
    .update({ status: "closed" })
    .eq("job_id", jobId)
    .neq("status", "withdrawn");
  throwIfError(allErr);
}

export async function reopenJob(admin: SupabaseClient, jobId: string): Promise<void> {
  const { error: jobErr } = await admin
    .from("jobs")
    .update({
      status: "open",
      closed_with_business_id: null,
      ...ACCOUNT_ACTIVE,
    })
    .eq("id", jobId);
  throwIfError(jobErr);

  const { error: intErr } = await admin
    .from("job_interests")
    .update({ status: "waiting" })
    .eq("job_id", jobId)
    .in("status", ["selected", "closed"]);
  throwIfError(intErr);
}

export async function softDeleteJob(admin: SupabaseClient, jobId: string): Promise<void> {
  const { error: jobErr } = await admin.from("jobs").update(ACCOUNT_DELETED).eq("id", jobId);
  throwIfError(jobErr);
  const { error: intErr } = await admin.from("job_interests").update(ACCOUNT_DELETED).eq("job_id", jobId);
  throwIfError(intErr);
}
