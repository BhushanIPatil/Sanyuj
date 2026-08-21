import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/admin";
import { normalizePhone, sha256 } from "@/lib/auth/phone";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone(body.phone ?? "");
    if (!phone) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const devMode = (process.env.OTP_DEV_MODE ?? "true").toLowerCase() === "true";
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    // Bypass real SMS until MSG91 is configured (even if OTP_DEV_MODE is false).
    const bypassSms = devMode || !authKey || !templateId;
    const code = bypassSms ? "123456" : String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from("otp_codes").update({ consumed: true }).eq("phone", phone).eq("consumed", false);
    const { error } = await supabase.from("otp_codes").insert({
      phone,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!bypassSms) {
      const smsRes = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: { "Content-Type": "application/json", authkey: authKey },
        body: JSON.stringify({
          template_id: templateId,
          short_url: "0",
          recipients: [{ mobiles: phone.replace("+", ""), var: code }],
        }),
      });
      if (!smsRes.ok) {
        return NextResponse.json({ error: "Failed to send OTP SMS" }, { status: 502 });
      }
    } else {
      console.log(`[OTP_BYPASS] ${phone} => ${code}`);
    }

    return NextResponse.json({
      ok: true,
      phone,
      message: bypassSms ? "OTP ready (SMS bypassed)" : "OTP sent",
      ...(bypassSms ? { dev_otp: code, bypass: true } : {}),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
