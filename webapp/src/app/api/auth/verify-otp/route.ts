import { NextResponse } from "next/server";
import {
  createAdminClient,
  createAnonAuthClient,
  sessionPayload,
} from "@/lib/auth/admin";
import { isAccountRestorable, restoreUserData } from "@/lib/auth/account";
import { normalizeEmail } from "@/lib/auth/email";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 6;

type OtpPurpose = "signup" | "restore" | "reset";

async function verifyEmailOtp(
  email: string,
  token: string,
  types: Array<"signup" | "email" | "recovery" | "magiclink">,
) {
  const anon = createAnonAuthClient();
  let lastError = "Invalid or expired code";

  for (const type of types) {
    const { data, error } = await anon.auth.verifyOtp({
      email,
      token,
      type,
    });
    if (!error && data.session && data.user) {
      return { session: data.session, user: data.user, error: null as string | null };
    }
    if (error?.message) lastError = error.message;
  }

  return { session: null, user: null, error: lastError };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email ?? "");
    const token = String(body.token ?? body.otp ?? "").trim();
    const purpose = String(body.purpose ?? "signup") as OtpPurpose;
    const password = String(body.password ?? "");

    if (!email) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json({ error: "Enter the 6-digit code from your email" }, { status: 400 });
    }
    if (!["signup", "restore", "reset"].includes(purpose)) {
      return NextResponse.json({ error: "Invalid verification purpose" }, { status: 400 });
    }

    if (purpose === "signup") {
      const result = await verifyEmailOtp(email, token, ["signup", "email"]);
      if (!result.session || !result.user) {
        return NextResponse.json({ error: result.error ?? "Invalid or expired code" }, { status: 400 });
      }

      const admin = createAdminClient();
      await admin.from("profiles").upsert(
        {
          id: result.user.id,
          email,
          is_active: true,
          is_deleted: false,
        },
        { onConflict: "id" },
      );

      return NextResponse.json({
        ok: true,
        session: sessionPayload(result.session, result.user),
      });
    }

    if (purpose === "restore") {
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

      const result = await verifyEmailOtp(email, token, ["email", "magiclink", "recovery"]);
      if (!result.session || !result.user) {
        return NextResponse.json({ error: result.error ?? "Invalid or expired code" }, { status: 400 });
      }

      const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, {
        email,
        password,
        email_confirm: true,
        user_metadata: { email },
      });
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      await restoreUserData(admin, existing.id);

      const { data: sessionData, error: signErr } = await admin.auth.signInWithPassword({
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
    }

    // purpose === "reset" — verify only; password is set in /api/auth/set-password
    const result = await verifyEmailOtp(email, token, ["recovery", "email"]);
    if (!result.session || !result.user) {
      return NextResponse.json({ error: result.error ?? "Invalid or expired code" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      session: sessionPayload(result.session, result.user),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
