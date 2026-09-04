import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/admin";
import { corsPreflight, withCors } from "@/lib/api/cors";
import { sendStoredNotification } from "@/lib/notifications";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  return corsPreflight(req);
}

/**
 * Admin-only: send an existing `push_notifications` row to all active devices.
 * Body: `{ notificationId: string }`
 * Auth: Bearer access token of an active admin.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return withCors(req, NextResponse.json({ error: "Not signed in" }, { status: 401 }));
    }

    const admin = createAdminClient();
    const token = authHeader.slice(7);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) {
      return withCors(req, NextResponse.json({ error: "Not signed in" }, { status: 401 }));
    }

    const { data: adminRow, error: adminErr } = await admin
      .from("admins")
      .select("id, full_name, email, is_active")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (adminErr) {
      return withCors(req, NextResponse.json({ error: adminErr.message }, { status: 500 }));
    }
    if (!adminRow || !adminRow.is_active) {
      return withCors(req, NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }

    const body = (await req.json()) as { notificationId?: string };
    if (!body.notificationId?.trim()) {
      return withCors(
        req,
        NextResponse.json({ error: "notificationId is required" }, { status: 400 }),
      );
    }

    const sentBy =
      (adminRow.full_name as string | null)?.trim() ||
      (adminRow.email as string | null)?.trim() ||
      "Admin";

    const result = await sendStoredNotification(admin, body.notificationId.trim(), sentBy);

    return withCors(
      req,
      NextResponse.json({
        ok: true,
        notificationId: result.notificationId,
        successCount: result.successCount,
        failureCount: result.failureCount,
        invalidTokens: result.invalidTokens.length,
      }),
    );
  } catch (e) {
    console.error(e);
    return withCors(
      req,
      NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not send notification" },
        { status: 500 },
      ),
    );
  }
}
