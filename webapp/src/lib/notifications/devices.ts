import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegisterDeviceInput } from "./types";

/**
 * Upsert an FCM token for a user.
 * - Same `device_token` → update metadata / reactivate / reassign to this user.
 * - Same `(user_id, device_id)` → replace the token for that physical device.
 */
export async function upsertDeviceToken(
  admin: SupabaseClient,
  userId: string,
  input: RegisterDeviceInput,
) {
  const deviceToken = input.deviceToken.trim();
  if (!deviceToken) throw new Error("deviceToken is required");

  const deviceId = input.deviceId?.trim() || null;
  const now = new Date().toISOString();
  const row = {
    user_id: userId,
    device_token: deviceToken,
    device_id: deviceId,
    device_name: input.deviceName?.trim() || null,
    device_os: input.deviceOs?.trim() || null,
    os_version: input.osVersion?.trim() || null,
    app_version: input.appVersion?.trim() || null,
    is_active: true,
    last_active_at: now,
  };

  if (deviceId) {
    const { data: byDevice } = await admin
      .from("device_tokens")
      .select("id")
      .eq("user_id", userId)
      .eq("device_id", deviceId)
      .maybeSingle();

    if (byDevice?.id) {
      // Free the token if another row already holds it (reinstall / user switch).
      await admin
        .from("device_tokens")
        .delete()
        .eq("device_token", deviceToken)
        .neq("id", byDevice.id);

      const { data, error } = await admin
        .from("device_tokens")
        .update(row)
        .eq("id", byDevice.id)
        .select("id, user_id, device_token, device_id, is_active, last_active_at")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  const { data: byToken } = await admin
    .from("device_tokens")
    .select("id")
    .eq("device_token", deviceToken)
    .maybeSingle();

  if (byToken?.id) {
    const { data, error } = await admin
      .from("device_tokens")
      .update(row)
      .eq("id", byToken.id)
      .select("id, user_id, device_token, device_id, is_active, last_active_at")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await admin
    .from("device_tokens")
    .insert(row)
    .select("id, user_id, device_token, device_id, is_active, last_active_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deactivateDeviceToken(
  admin: SupabaseClient,
  userId: string,
  deviceToken: string,
) {
  const { error } = await admin
    .from("device_tokens")
    .update({ is_active: false, last_active_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("device_token", deviceToken.trim());
  if (error) throw new Error(error.message);
}

export async function deactivateDeviceTokensForUser(admin: SupabaseClient, userId: string) {
  const { error } = await admin
    .from("device_tokens")
    .update({ is_active: false, last_active_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_active", true);
  if (error) throw new Error(error.message);
}

export async function listActiveTokens(
  admin: SupabaseClient,
  options?: { userIds?: string[] },
): Promise<string[]> {
  let query = admin.from("device_tokens").select("device_token").eq("is_active", true);
  if (options?.userIds?.length) {
    query = query.in("user_id", options.userIds);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => r.device_token as string)
    .filter((t) => !!t);
}

export async function deactivateInvalidTokens(admin: SupabaseClient, tokens: string[]) {
  if (!tokens.length) return;
  const { error } = await admin
    .from("device_tokens")
    .update({ is_active: false, last_active_at: new Date().toISOString() })
    .in("device_token", tokens);
  if (error) throw new Error(error.message);
}
