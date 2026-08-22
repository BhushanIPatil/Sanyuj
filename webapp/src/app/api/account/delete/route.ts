import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/admin";
import { softDeleteUserData } from "@/lib/auth/account";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const admin = createAdminClient();
    await softDeleteUserData(admin, user.id);
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not delete account" },
      { status: 500 },
    );
  }
}
