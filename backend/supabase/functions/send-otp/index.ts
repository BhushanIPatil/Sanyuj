import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (raw.startsWith("+91") && digits.length === 12) return `+${digits}`;
  return null;
}

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { phone: rawPhone } = await req.json();
    const phone = normalizePhone(rawPhone ?? "");
    if (!phone) return json({ error: "Enter a valid 10-digit Indian mobile number" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const devMode = (Deno.env.get("OTP_DEV_MODE") ?? "true").toLowerCase() === "true";
    const code = devMode ? "123456" : String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from("otp_codes").update({ consumed: true }).eq("phone", phone).eq("consumed", false);

    const { error } = await supabase.from("otp_codes").insert({
      phone,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (error) return json({ error: error.message }, 500);

    const authKey = Deno.env.get("MSG91_AUTH_KEY");
    const templateId = Deno.env.get("MSG91_TEMPLATE_ID");

    if (!devMode && authKey && templateId) {
      const smsRes = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: authKey,
        },
        body: JSON.stringify({
          template_id: templateId,
          short_url: "0",
          recipients: [{ mobiles: phone.replace("+", ""), var: code }],
        }),
      });
      if (!smsRes.ok) {
        const text = await smsRes.text();
        console.error("MSG91 error", text);
        return json({ error: "Failed to send OTP SMS" }, 502);
      }
    } else {
      console.log(`[OTP_DEV] ${phone} => ${code}`);
    }

    return json({
      ok: true,
      phone,
      message: "OTP sent",
      ...(devMode ? { dev_otp: code } : {}),
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Unexpected error" }, 500);
  }
});
