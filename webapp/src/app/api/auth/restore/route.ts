import { NextResponse } from "next/server";
import { createAdminClient, sessionPayload } from "@/lib/auth/admin";
import { isAccountRestorable, restoreUserData } from "@/lib/auth/account";
import { normalizeEmail } from "@/lib/auth/email";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 6;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email ?? "");
    const password = String(body.password ?? "");

    if (!email) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, is_active, is_deleted")
      .eq("email", email)
      .maybeSingle();

    if (!existing || !isAccountRestorable(existing)) {
      return NextResponse.json({ error: "No deleted account found for this email" }, { status: 404 });
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: { email },
    });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await restoreUserData(supabase, existing.id);

    const { data: sessionData, error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr || !sessionData.session || !sessionData.user) {
      return NextResponse.json(
        { error: signErr?.message ?? "Account restored but sign-in failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      session: sessionPayload(sessionData.session, sessionData.user),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
