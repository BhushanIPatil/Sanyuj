import { createClient as supabaseClient } from "@supabase/supabase-js";
let client: ReturnType<typeof supabaseClient> | undefined;
export function createClient() {
  return (client ??= supabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  ));
}
