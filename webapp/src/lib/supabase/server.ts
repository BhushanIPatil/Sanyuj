import { createClient as createSupabaseClient } from "@supabase/supabase-js";
/** Public data endpoints always use anonymous access, ignoring legacy auth cookies. */
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
