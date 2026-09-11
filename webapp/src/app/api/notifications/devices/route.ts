import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/admin";
import { clientIp } from "@/lib/rate-limit";
import { corsPreflight, withCors } from "@/lib/api/cors";
export const OPTIONS = corsPreflight;
async function handle(req: Request, active: boolean) {
  const reply = (body: object, status = 200) => withCors(req, NextResponse.json(body, { status }));
  try {
    const raw = await req.text();
    if (raw.length > 5000) return reply({ error: "Request too large" }, 413);
    const body = JSON.parse(raw);
    if (
      typeof body?.deviceToken !== "string" ||
      body.deviceToken.length < 20 ||
      body.deviceToken.length > 2048
    )
      return reply({ error: "Invalid device token" }, 400);
    const admin = createAdminClient();
    const { data: limit, error: limitError } = await admin.rpc("check_and_consume_rate_limit", {
      p_action: "public_device_registration",
      p_subject_type: "ip",
      p_subject_key: clientIp(req) || "unknown",
      p_limit: 60,
      p_window_seconds: 3600,
    });
    if (limitError) return reply({ error: "Try again later" }, 503);
    if (!limit.allowed) return reply({ error: "Too many requests" }, 429);
    const metadata = (key: string) => (typeof body[key] === "string" ? body[key].trim().slice(0, 200) : null);
    const { error } = active
      ? await admin
          .from("device_tokens")
          .upsert(
            {
              device_token: body.deviceToken,
              device_os: metadata("deviceOs"),
              app_version: metadata("appVersion"),
              is_active: true,
              last_active_at: new Date().toISOString(),
            },
            { onConflict: "device_token" },
          )
      : await admin.from("device_tokens").update({ is_active: false }).eq("device_token", body.deviceToken);
    if (error) return reply({ error: "Could not update notification registration" }, 500);
    return reply({ ok: true });
  } catch {
    return reply({ error: "Invalid registration request" }, 400);
  }
}
export async function POST(req: Request) {
  return handle(req, true);
}
export async function DELETE(req: Request) {
  return handle(req, false);
}
