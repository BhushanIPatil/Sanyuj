import { NextResponse } from "next/server";
import { createAdminClient, sessionPayload } from "@/lib/auth/admin";
import { isAccountRestorable, isAccountUsable } from "@/lib/auth/account";
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

    if (existing) {
      if (isAccountRestorable(existing)) {
        return NextResponse.json(
          {
            restore_available: true,
            error: "An account already exists with this email. Do you want to restore it?",
          },
          { status: 409 },
        );
      }
      if (isAccountUsable(existing)) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please log in." },
          { status: 409 },
        );
      }
    }

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { email },
    });
    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Could not create account";
      if (/already|registered|exists/i.test(msg)) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please log in." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    await supabase.from("profiles").upsert(
      {
        id: created.user.id,
        email,
        is_active: true,
        is_deleted: false,
      },
      { onConflict: "id" },
    );

    const { data: sessionData, error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr || !sessionData.session || !sessionData.user) {
      return NextResponse.json(
        { error: signErr?.message ?? "Account created but sign-in failed" },
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
