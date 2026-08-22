import { NextResponse } from "next/server";
import { createAdminClient, mintSessionForEmail, sessionPayload } from "@/lib/auth/admin";
import { isAccountRestorable, isAccountUsable } from "@/lib/auth/account";
import { normalizePhone, phoneToEmail, sha256 } from "@/lib/auth/phone";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone(body.phone ?? "");
    const otp = String(body.otp ?? "").trim();
    if (!phone) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    if (otp.length < 4) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });

    const supabase = createAdminClient();
    const { data: rows, error: otpErr } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("consumed", false)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (otpErr) return NextResponse.json({ error: otpErr.message }, { status: 500 });
    const row = rows?.[0];
    if (!row) return NextResponse.json({ error: "OTP expired. Request a new one." }, { status: 400 });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "OTP expired. Request a new one." }, { status: 400 });
    }
    if (row.attempts >= 5) {
      return NextResponse.json({ error: "Too many attempts. Request a new OTP." }, { status: 429 });
    }

    const hash = await sha256(otp);
    if (hash !== row.code_hash) {
      await supabase.from("otp_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      return NextResponse.json({ error: "Incorrect OTP" }, { status: 400 });
    }

    await supabase.from("otp_codes").update({ consumed: true, is_active: false }).eq("id", row.id);

    const email = phoneToEmail(phone);

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, is_active, is_deleted")
      .eq("phone", phone)
      .maybeSingle();

    if (isAccountRestorable(existingProfile)) {
      return NextResponse.json(
        {
          restore_available: true,
          error: "An account already exists with this contact. Do you want to restore it?",
        },
        { status: 409 },
      );
    }

    let userId = existingProfile?.id as string | undefined;

    if (!userId) {
      // OTP-only signup: temporary password; password accounts use /api/auth/register.
      const password = randomUUID() + randomUUID();
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone,
        phone_confirm: true,
        user_metadata: { phone },
      });
      if (createErr || !created.user) {
        return NextResponse.json({ error: createErr?.message ?? "Could not create user" }, { status: 500 });
      }
      userId = created.user.id;
    } else if (!isAccountUsable(existingProfile)) {
      return NextResponse.json({ error: "This account is not active" }, { status: 403 });
    } else {
      await supabase.auth.admin.updateUserById(userId, {
        phone,
        phone_confirm: true,
        user_metadata: { phone },
      });
    }

    await supabase.from("profiles").upsert(
      { id: userId, phone, is_active: true, is_deleted: false },
      { onConflict: "id" },
    );

    const { session, user, error: mintErr } = await mintSessionForEmail(email);
    if (mintErr || !session || !user) {
      return NextResponse.json({ error: mintErr ?? "Could not create session" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      session: sessionPayload(session, user),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
