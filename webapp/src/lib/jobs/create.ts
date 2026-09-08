import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasPostedJobToday,
  isJobDailyLimitError,
  JOB_DAILY_LIMIT_CODE,
  JOB_DAILY_LIMIT_MESSAGE,
} from "@/lib/jobs/daily-limit";

export type CreateJobInput = {
  categoryId: string;
  title: string;
  description: string;
  pincode: string;
  locality: string;
  areaId?: string | null;
  area?: string | null;
  urgency: "today" | "this_week" | "flexible";
  budgetMin?: number | null;
  budgetMax?: number | null;
};

export type CreateJobResult =
  | { ok: true; job: Record<string, unknown> }
  | { ok: false; status: number; error: string; code?: string };

const URGENCIES = new Set(["today", "this_week", "flexible"]);

export function validateCreateJobInput(body: Partial<CreateJobInput>): string | null {
  if (!body.categoryId?.trim()) return "Select a category";
  if (!body.title?.trim()) return "Title is required";
  if (!body.description?.trim()) return "Describe what you need";
  if (!body.pincode?.trim()) return "Set your pincode in profile first";
  if (!body.locality?.trim()) return "Select a locality for this job";
  if (!body.urgency || !URGENCIES.has(body.urgency)) {
    return "Invalid urgency";
  }
  return null;
}

export async function createJobForUser(
  admin: SupabaseClient,
  userId: string,
  input: CreateJobInput,
): Promise<CreateJobResult> {
  if (await hasPostedJobToday(admin, userId)) {
    return {
      ok: false,
      status: 429,
      error: JOB_DAILY_LIMIT_MESSAGE,
      code: JOB_DAILY_LIMIT_CODE,
    };
  }

  const { data, error } = await admin
    .from("jobs")
    .insert({
      customer_id: userId,
      category_id: input.categoryId.trim(),
      title: input.title.trim().slice(0, 80),
      description: input.description.trim(),
      budget_min: input.budgetMin ?? null,
      budget_max: input.budgetMax ?? null,
      urgency: input.urgency,
      pincode: input.pincode.trim(),
      locality: input.locality.trim(),
      area_id: input.areaId || null,
      area: input.area || null,
      is_active: true,
      is_deleted: false,
    })
    .select("*")
    .single();

  if (error) {
    if (isJobDailyLimitError(error.message)) {
      return {
        ok: false,
        status: 429,
        error: JOB_DAILY_LIMIT_MESSAGE,
        code: JOB_DAILY_LIMIT_CODE,
      };
    }
    return { ok: false, status: 400, error: error.message };
  }

  return { ok: true, job: data as Record<string, unknown> };
}
