import type { SupabaseClient } from "@supabase/supabase-js";

export const ACCOUNT_ACTIVE = { is_active: true, is_deleted: false } as const;
export const ACCOUNT_INACTIVE = { is_active: false, is_deleted: false } as const;
export const ACCOUNT_DELETED = { is_active: false, is_deleted: true } as const;

async function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function softDeleteUserData(admin: SupabaseClient, userId: string) {
  const { data: businesses, error: bizErr } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", userId);
  throwIfError(bizErr);
  const businessIds = (businesses ?? []).map((b) => b.id as string);

  const { error: pErr } = await admin.from("profiles").update(ACCOUNT_DELETED).eq("id", userId);
  throwIfError(pErr);

  const { error: tokenErr } = await admin
    .from("device_tokens")
    .update({ is_active: false, last_active_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_active", true);
  throwIfError(tokenErr);

  const { error: bErr } = await admin.from("businesses").update(ACCOUNT_DELETED).eq("owner_id", userId);
  throwIfError(bErr);

  if (businessIds.length) {
    const { error: lErr } = await admin
      .from("live_sessions")
      .update(ACCOUNT_DELETED)
      .in("business_id", businessIds);
    throwIfError(lErr);
  }
}

export async function restoreUserData(admin: SupabaseClient, userId: string) {
  const { data: businesses, error: bizErr } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", userId);
  throwIfError(bizErr);
  const businessIds = (businesses ?? []).map((b) => b.id as string);

  const { error: pErr } = await admin.from("profiles").update(ACCOUNT_ACTIVE).eq("id", userId);
  throwIfError(pErr);

  const { error: bErr } = await admin.from("businesses").update(ACCOUNT_ACTIVE).eq("owner_id", userId);
  throwIfError(bErr);

  if (businessIds.length) {
    const { error: lErr } = await admin
      .from("live_sessions")
      .update({ is_active: false, is_deleted: false })
      .in("business_id", businessIds);
    throwIfError(lErr);
  }
}

export async function deactivateUserProfile(admin: SupabaseClient, userId: string) {
  const { error } = await admin.from("profiles").update(ACCOUNT_INACTIVE).eq("id", userId);
  throwIfError(error);
}
