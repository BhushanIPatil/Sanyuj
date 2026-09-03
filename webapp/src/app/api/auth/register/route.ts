import { NextResponse } from "next/server";
import { createAdminClient, createAnonAuthClient, sessionPayload } from "@/lib/auth/admin";
import { isAccountRestorable, isAccountUsable } from "@/lib/auth/account";
import { normalizeEmail } from "@/lib/auth/email";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 6;

function emailRedirectTo(req: Request, bodyRedirect?: string) {
  const fromBody = String(bodyRedirect ?? "").trim();
  if (fromBody.startsWith("https://") || fromBody.startsWith("http://")) return fromBody;
  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://sanyuj.app";
  return `${origin.replace(/\/$/, "")}/auth/login`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email ?? "");
    const password = String(body.password ?? "");
    const redirectTo = emailRedirectTo(req, body.redirectTo);

    if (!email) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
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

    const anon = createAnonAuthClient();
    const { data: signed, error: signErr } = await anon.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { email },
      },
    });
    if (signErr) {
      const msg = signErr.message ?? "Could not create account";
      if (/already|registered|exists/i.test(msg)) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please log in." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Supabase returns an empty identities list when the email is already registered.
    if (signed.user && (signed.user.identities?.length ?? 0) === 0) {
      return NextResponse.json(
        {
          error:
            "This email is already registered. Log in, or check your inbox if you still need to confirm.",
        },
        { status: 409 },
      );
    }

    if (signed.user) {
      await admin.from("profiles").upsert(
        {
          id: signed.user.id,
          email,
          is_active: true,
          is_deleted: false,
        },
        { onConflict: "id" },
      );
    }

    if (signed.session && signed.user) {
      return NextResponse.json({
        ok: true,
        session: sessionPayload(signed.session, signed.user),
      });
    }

    return NextResponse.json({
      ok: true,
      confirmation_sent: true,
      email,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
