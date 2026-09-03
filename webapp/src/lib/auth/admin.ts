import { createClient, type Session, type User } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase admin env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Anon client — required for `signUp` so Supabase actually sends the confirmation email. */
export function createAnonAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase anon env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function sessionPayload(session: Session, user: User) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user,
  };
}

/** Mint a session without rotating the user's password (OTP / admin flows). */
export async function mintSessionForEmail(email: string) {
  const supabase = createAdminClient();
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr || !linkData.properties?.hashed_token) {
    return { session: null, user: null, error: linkErr?.message ?? "Could not create session" };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "email",
  });
  if (error || !data.session || !data.user) {
    return { session: null, user: null, error: error?.message ?? "Could not create session" };
  }
  return { session: data.session, user: data.user, error: null };
}
