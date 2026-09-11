import type { SupabaseClient } from "@supabase/supabase-js";
/** Tokens are installation registrations, with no account or contact linkage. */
export async function listActiveTokens(admin: SupabaseClient): Promise<string[]> {
  const tokens: string[] = [];
  // Supabase caps each response; page so broadcasts reach every registration.
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from("device_tokens").select("device_token").eq("is_active", true).order("id").range(offset, offset + 999);
    if (error) throw new Error(error.message);
    tokens.push(...(data ?? []).map(row => row.device_token as string).filter(Boolean));
    if (!data || data.length < 1000) break;
  }
  return tokens;
}
export async function deactivateInvalidTokens(admin: SupabaseClient, tokens: string[]) {
  for (let i = 0; i < tokens.length; i += 500) {
    const { error } = await admin.from("device_tokens").update({ is_active: false, last_active_at: new Date().toISOString() }).in("device_token", tokens.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
}
