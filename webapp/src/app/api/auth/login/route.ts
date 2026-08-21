import { NextResponse } from "next/server";
import { createAdminClient, sessionPayload } from "@/lib/auth/admin";
import { normalizePhone, phoneToEmail } from "@/lib/auth/phone";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone(body.phone ?? "");
    const password = String(body.password ?? "");

    if (!phone) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Enter your password" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const email = phoneToEmail(phone);

    const { data: sessionData, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr || !sessionData.session || !sessionData.user) {
      return NextResponse.json({ error: "Invalid mobile number or password" }, { status: 401 });
    }

    await supabase.from("profiles").upsert(
      { id: sessionData.user.id, phone },
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
