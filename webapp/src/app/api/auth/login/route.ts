import { NextResponse } from "next/server";
import { createAdminClient, sessionPayload } from "@/lib/auth/admin";
import { isAccountRestorable, isAccountUsable } from "@/lib/auth/account";
import { normalizeEmail } from "@/lib/auth/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email ?? "");
    const password = String(body.password ?? "");

    if (!email) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Enter your password" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_active, is_deleted")
      .eq("email", email)
      .maybeSingle();

    if (isAccountRestorable(profile)) {
      return NextResponse.json(
        {
          restore_available: true,
          error: "This account was deleted. Create an account with this email to restore it.",
        },
        { status: 409 },
      );
    }

    const { data: sessionData, error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr || !sessionData.session || !sessionData.user) {
      const msg = signErr?.message ?? "";
      if (/not confirmed|email not confirmed/i.test(msg)) {
        return NextResponse.json(
          {
            confirmation_required: true,
            otp_required: true,
            email,
            error: "Verify your email with the 6-digit code we sent, then log in.",
          },
          { status: 403 },
        );
      }
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (profile && !isAccountUsable(profile)) {
      return NextResponse.json({ error: "This account is not active" }, { status: 403 });
    }

    await supabase.from("profiles").upsert(
      {
        id: sessionData.user.id,
        email,
        is_active: true,
        is_deleted: false,
      },
      { onConflict: "id" },
    );

    return NextResponse.json({
      ok: true,
      session: sessionPayload(sessionData.session, sessionData.user),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
