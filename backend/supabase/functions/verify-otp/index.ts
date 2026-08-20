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

function phoneToEmail(phone: string) {
  return `${phone.replace(/\D/g, "")}@users.sanyuj.app`;
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
    const { phone: rawPhone, otp } = await req.json();
    const phone = normalizePhone(rawPhone ?? "");
    if (!phone) return json({ error: "Invalid phone" }, 400);
    if (!otp || String(otp).length < 4) return json({ error: "Invalid OTP" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: rows, error: otpErr } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("consumed", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (otpErr) return json({ error: otpErr.message }, 500);
    const row = rows?.[0];
    if (!row) return json({ error: "OTP expired. Request a new one." }, 400);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: "OTP expired. Request a new one." }, 400);
    }
    if (row.attempts >= 5) return json({ error: "Too many attempts. Request a new OTP." }, 429);

    const hash = await sha256(String(otp).trim());
    if (hash !== row.code_hash) {
      await supabase.from("otp_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      return json({ error: "Incorrect OTP" }, 400);
    }

    await supabase.from("otp_codes").update({ consumed: true }).eq("id", row.id);

    const email = phoneToEmail(phone);
    const password = crypto.randomUUID() + crypto.randomUUID();

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
      if (createErr || !created.user) return json({ error: createErr?.message ?? "Could not create user" }, 500);
      userId = created.user.id;
    }

    await supabase.from("profiles").upsert({ id: userId!, phone }, { onConflict: "id" });

    const { data: sessionData, error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr || !sessionData.session) {
      return json({ error: signErr?.message ?? "Could not create session" }, 500);
    }

    return json({
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
    return json({ error: "Unexpected error" }, 500);
  }
});
