import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizePhone, phoneToEmail, sha256 } from "@/lib/auth/phone";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase admin env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone(body.phone ?? "");
    const otp = String(body.otp ?? "").trim();
    if (!phone) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    if (otp.length < 4) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });

    const supabase = admin();
    const { data: rows, error: otpErr } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("consumed", false)
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

    await supabase.from("otp_codes").update({ consumed: true }).eq("id", row.id);

    const email = phoneToEmail(phone);
    const password = randomUUID() + randomUUID();

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    let userId = existingProfile?.id as string | undefined;

    if (userId) {
      await supabase.auth.admin.updateUserById(userId, {
        password,
        phone,
        phone_confirm: true,
        user_metadata: { phone },
      });
    } else {
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
    }

    await supabase.from("profiles").upsert({ id: userId, phone }, { onConflict: "id" });

    const { data: sessionData, error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr || !sessionData.session) {
      return NextResponse.json({ error: signErr?.message ?? "Could not create session" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_in: sessionData.session.expires_in,
        token_type: sessionData.session.token_type,
        user: sessionData.user,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
