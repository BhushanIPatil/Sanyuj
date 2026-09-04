import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/admin";
import { corsPreflight, withCors } from "@/lib/api/cors";
import {
  deactivateDeviceToken,
  upsertDeviceToken,
} from "@/lib/notifications";
import {
  ipSubject,
  rejectIfRateLimited,
  subjects,
  userSubject,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

async function requireBearerUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null as string | null, error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  const token = authHeader.slice(7);
  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return {
      userId: null as string | null,
      error: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }
  return { userId: data.user.id, error: null as NextResponse | null, admin };
}

export async function OPTIONS(req: Request) {
  return corsPreflight(req);
}

/** Register / refresh an FCM device token for the signed-in user. */
export async function POST(req: Request) {
  try {
    const auth = await requireBearerUser(req);
    if (auth.error || !auth.userId) {
      return withCors(req, auth.error!);
    }

    const limited = await rejectIfRateLimited(
      "register_device",
      subjects(userSubject(auth.userId), ipSubject(req)),
    );
    if (limited) return withCors(req, limited);

    const body = (await req.json()) as {
      deviceToken?: string;
      deviceId?: string;
      deviceName?: string;
      deviceOs?: string;
      osVersion?: string;
      appVersion?: string;
    };

    if (!body.deviceToken?.trim()) {
      return withCors(
        req,
        NextResponse.json({ error: "deviceToken is required" }, { status: 400 }),
      );
    }

    const row = await upsertDeviceToken(auth.admin!, auth.userId, {
      deviceToken: body.deviceToken,
      deviceId: body.deviceId,
      deviceName: body.deviceName,
      deviceOs: body.deviceOs,
      osVersion: body.osVersion,
      appVersion: body.appVersion,
    });

    return withCors(req, NextResponse.json({ ok: true, device: row }));
  } catch (e) {
    console.error(e);
    return withCors(
      req,
      NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not register device" },
        { status: 500 },
      ),
    );
  }
}

/** Mark a device token inactive (logout / uninstall). */
export async function DELETE(req: Request) {
  try {
    const auth = await requireBearerUser(req);
    if (auth.error || !auth.userId) {
      return withCors(req, auth.error!);
    }

    const body = (await req.json().catch(() => ({}))) as { deviceToken?: string };
    if (!body.deviceToken?.trim()) {
      return withCors(
        req,
        NextResponse.json({ error: "deviceToken is required" }, { status: 400 }),
      );
    }

    await deactivateDeviceToken(auth.admin!, auth.userId, body.deviceToken);
    return withCors(req, NextResponse.json({ ok: true }));
  } catch (e) {
    console.error(e);
    return withCors(
      req,
      NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not deactivate device" },
        { status: 500 },
      ),
    );
  }
}
