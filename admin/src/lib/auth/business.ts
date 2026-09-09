import type { SupabaseClient } from "@supabase/supabase-js";
import { ACCOUNT_ACTIVE, ACCOUNT_DELETED, ACCOUNT_INACTIVE } from "@/lib/auth/account";

async function throwIfError(error: { message: string; code?: string } | null) {
  if (error) throw new Error(error.message);
}

export async function softDeleteBusiness(admin: SupabaseClient, businessId: string) {
  const now = new Date().toISOString();
  const { error: liveErr } = await admin
    .from("live_sessions")
    .update({ is_active: false, is_deleted: true, ends_at: now })
    .eq("business_id", businessId)
    .eq("is_deleted", false);
  throwIfError(liveErr);

  const { error: coverageErr } = await admin
    .from("business_service_areas")
    .update(ACCOUNT_DELETED)
    .eq("business_id", businessId)
    .eq("is_deleted", false);
  throwIfError(coverageErr);

  const { error: bizErr } = await admin.from("businesses").update(ACCOUNT_DELETED).eq("id", businessId);
  throwIfError(bizErr);
}

export async function restoreBusiness(admin: SupabaseClient, businessId: string) {
  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .maybeSingle();
  throwIfError(bizErr);
  if (!biz) throw new Error("Business not found");

  const { data: other, error: otherErr } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", biz.owner_id)
    .eq("is_deleted", false)
    .neq("id", businessId)
    .maybeSingle();
  throwIfError(otherErr);
  if (other) {
    throw new Error("This owner already has another listed business. Delete that one first to restore this listing.");
  }

  const { error: restoreErr } = await admin.from("businesses").update(ACCOUNT_ACTIVE).eq("id", businessId);
  throwIfError(restoreErr);

  const { error: coverageErr } = await admin
    .from("business_service_areas")
    .update(ACCOUNT_ACTIVE)
    .eq("business_id", businessId);
  throwIfError(coverageErr);

  const { error: liveErr } = await admin
    .from("live_sessions")
    .update({ is_active: false, is_deleted: false })
    .eq("business_id", businessId);
  throwIfError(liveErr);
}

export async function deactivateBusiness(admin: SupabaseClient, businessId: string) {
  const now = new Date().toISOString();
  const { error: liveErr } = await admin
    .from("live_sessions")
    .update({ is_active: false, ends_at: now })
    .eq("business_id", businessId)
    .eq("is_active", true)
    .eq("is_deleted", false);
  throwIfError(liveErr);

  const { error: bizErr } = await admin.from("businesses").update(ACCOUNT_INACTIVE).eq("id", businessId);
  throwIfError(bizErr);
}
