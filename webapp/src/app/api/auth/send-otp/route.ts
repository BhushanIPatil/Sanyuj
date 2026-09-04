import { NextResponse } from "next/server";
import { createAdminClient, createAnonAuthClient } from "@/lib/auth/admin";
import { isAccountRestorable, isAccountUsable } from "@/lib/auth/account";
import { normalizeEmail } from "@/lib/auth/email";
import {
  emailSubject,
  ipSubject,
  rejectIfRateLimited,
  subjects,
  type RateLimitAction,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

type OtpPurpose = "signup" | "restore" | "reset";

function emailRedirectTo(req: Request, bodyRedirect?: string) {
  const fromBody = String(bodyRedirect ?? "").trim();
  if (fromBody.startsWith("https://") || fromBody.startsWith("http://")) return fromBody;
  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://sanyuj.app";
  return `${origin.replace(/\/$/, "")}/auth/login`;
}

function rateLimitActionForPurpose(purpose: OtpPurpose): RateLimitAction {
  return purpose === "reset" ? "forgot_password" : "send_otp";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email ?? "");
    const purpose = String(body.purpose ?? "signup") as OtpPurpose;
    const redirectTo = emailRedirectTo(req, body.redirectTo);

    if (!email) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (!["signup", "restore", "reset"].includes(purpose)) {
      return NextResponse.json({ error: "Invalid OTP purpose" }, { status: 400 });
    }

    const limited = await rejectIfRateLimited(
      rateLimitActionForPurpose(purpose),
      subjects(emailSubject(email), ipSubject(req)),
    );
    if (limited) return limited;

    const admin = createAdminClient();
    const anon = createAnonAuthClient();

    if (purpose === "signup") {
      const { error } = await anon.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        return NextResponse.json({ error: error.message || "Could not resend code" }, { status: 400 });
      }
      return NextResponse.json({ ok: true, otp_sent: true, email, purpose });
    }

    if (purpose === "restore") {
      const { data: existing } = await admin
        .from("profiles")
        .select("id, is_active, is_deleted")
        .eq("email", email)
        .maybeSingle();

      if (!existing || !isAccountRestorable(existing)) {
        return NextResponse.json({ error: "No deleted account found for this email" }, { status: 404 });
      }

      const { error } = await anon.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: redirectTo,
        },
      });
      if (error) {
        return NextResponse.json({ error: error.message || "Could not send code" }, { status: 400 });
      }
      return NextResponse.json({ ok: true, otp_sent: true, email, purpose });
    }

    // purpose === "reset"
    const { data: profile } = await admin
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

    if (profile && !isAccountUsable(profile)) {
      return NextResponse.json({ error: "This account is not active" }, { status: 403 });
    }

    // Always return success-shaped response when possible to avoid email enumeration,
    // but still attempt send for known/unknown addresses via Supabase.
    const { error } = await anon.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      // Soft-fail unknown emails as ok so the UI can still show the OTP step tip.
      if (!/not found|unable to find|user not found/i.test(error.message)) {
        return NextResponse.json({ error: error.message || "Could not send reset code" }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true, otp_sent: true, email, purpose: "reset" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
