import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function emptyToNull(value: unknown) {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "");
    const fullName = emptyToNull(body.full_name);
    const phone = emptyToNull(body.phone);

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        email,
        full_name: fullName,
        phone,
      },
    });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? "Could not create user" }, { status: 500 });
    }

    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: data.user.id,
        email,
        phone,
        full_name: fullName,
        pincode: emptyToNull(body.pincode),
        locality: emptyToNull(body.locality),
        area: emptyToNull(body.area),
        area_id: emptyToNull(body.area_id),
        address: emptyToNull(body.address),
        onboarding_complete: Boolean(body.onboarding_complete),
        is_active: body.is_active === false ? false : true,
        is_deleted: false,
      },
      { onConflict: "id" },
    );
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.user.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
