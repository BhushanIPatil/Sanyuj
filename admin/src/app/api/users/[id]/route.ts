import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  deactivateUserProfile,
  restoreUserData,
  softDeleteUserData,
} from "@/lib/auth/account";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function emptyToNull(value: unknown) {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  try {
    const body = await req.json();
    const admin = createAdminClient();

    const { data: current, error: currentErr } = await admin
      .from("profiles")
      .select("id, email, is_active, is_deleted")
      .eq("id", id)
      .maybeSingle();
    if (currentErr) return NextResponse.json({ error: currentErr.message }, { status: 500 });
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const email = body.email != null ? normalizeEmail(body.email) : current.email;
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    if (email && email !== current.email) {
      const { data: clash } = await admin.from("profiles").select("id").eq("email", email).neq("id", id).maybeSingle();
      if (clash) {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }
      const { error: authErr } = await admin.auth.admin.updateUserById(id, {
        email,
        email_confirm: true,
      });
      if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    const patch: Record<string, unknown> = {
      email,
      full_name: emptyToNull(body.full_name),
      phone: emptyToNull(body.phone),
      pincode: emptyToNull(body.pincode),
      locality: emptyToNull(body.locality),
      area: emptyToNull(body.area),
      address: emptyToNull(body.address),
      onboarding_complete: Boolean(body.onboarding_complete),
    };

    const { error: profileErr } = await admin.from("profiles").update(patch).eq("id", id);
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    const status = String(body.status ?? "");
    if (status === "deleted" && !current.is_deleted) {
      await softDeleteUserData(admin, id);
    } else if (status === "active" && (current.is_deleted || !current.is_active)) {
      await restoreUserData(admin, id);
    } else if (status === "inactive" && (current.is_deleted || current.is_active)) {
      if (current.is_deleted) await restoreUserData(admin, id);
      await deactivateUserProfile(admin, id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { data: current } = await admin.from("profiles").select("id").eq("id", id).maybeSingle();
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });
    await softDeleteUserData(admin, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
