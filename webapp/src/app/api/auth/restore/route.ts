import { NextResponse } from "next/server";
import { createAdminClient, createAnonAuthClient } from "@/lib/auth/admin";
import { isAccountRestorable } from "@/lib/auth/account";
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

    if (!existing || !isAccountRestorable(existing)) {
      return NextResponse.json({ error: "No deleted account found for this email" }, { status: 404 });
    }

    const anon = createAnonAuthClient();
    const { error } = await anon.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo,
      },
    });
    if (error) {
      return NextResponse.json({ error: error.message || "Could not send verification code" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      otp_sent: true,
      email,
      purpose: "restore",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
