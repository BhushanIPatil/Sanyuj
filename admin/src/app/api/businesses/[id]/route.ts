import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { deactivateBusiness, restoreBusiness, softDeleteBusiness } from "@/lib/auth/business";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function emptyToNull(value: unknown) {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing business id" }, { status: 400 });

  try {
    const body = await req.json();
    const admin = createAdminClient();

    const { data: current, error: currentErr } = await admin
      .from("businesses")
      .select("id, is_active, is_deleted")
      .eq("id", id)
      .maybeSingle();
    if (currentErr) return NextResponse.json({ error: currentErr.message }, { status: 500 });
    if (!current) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Business name is required" }, { status: 400 });

    const categoryId = emptyToNull(body.category_id);
    if (!categoryId) return NextResponse.json({ error: "Category is required" }, { status: 400 });

    const { data: category, error: catErr } = await admin
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .maybeSingle();
    if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });

    const { error: patchErr } = await admin
      .from("businesses")
      .update({
        name,
        category_id: categoryId,
        photo_url: emptyToNull(body.photo_url),
      })
      .eq("id", id);
    if (patchErr) return NextResponse.json({ error: patchErr.message }, { status: 500 });

    const status = String(body.status ?? "");
    if (status === "deleted" && !current.is_deleted) {
      await softDeleteBusiness(admin, id);
    } else if (status === "active" && (current.is_deleted || !current.is_active)) {
      await restoreBusiness(admin, id);
    } else if (status === "inactive" && (current.is_deleted || current.is_active)) {
      if (current.is_deleted) await restoreBusiness(admin, id);
      await deactivateBusiness(admin, id);
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
  if (!id) return NextResponse.json({ error: "Missing business id" }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { data: current } = await admin.from("businesses").select("id").eq("id", id).maybeSingle();
    if (!current) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    await softDeleteBusiness(admin, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
