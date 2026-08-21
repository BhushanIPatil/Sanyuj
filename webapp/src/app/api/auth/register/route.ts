import { NextResponse } from "next/server";
import { createAdminClient, sessionPayload } from "@/lib/auth/admin";
import { normalizePhone, phoneToEmail } from "@/lib/auth/phone";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 6;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone(body.phone ?? "");
    const password = String(body.password ?? "");

    if (!phone) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number" }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const email = phoneToEmail(phone);

    const { data: existing } = await supabase.from("profiles").select("id").eq("phone", phone).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "An account with this number already exists. Please log in." }, { status: 409 });
    }

    // OTP / MSG91 bypass for now — phone is accepted as-is; wire verification later.
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone,
      phone_confirm: true,
      user_metadata: { phone },
    });
    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Could not create account";
      if (/already|registered|exists/i.test(msg)) {
        return NextResponse.json({ error: "An account with this number already exists. Please log in." }, { status: 409 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    await supabase.from("profiles").upsert({ id: created.user.id, phone }, { onConflict: "id" });

    const { data: sessionData, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr || !sessionData.session || !sessionData.user) {
      return NextResponse.json({ error: signErr?.message ?? "Account created but sign-in failed" }, { status: 500 });
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
