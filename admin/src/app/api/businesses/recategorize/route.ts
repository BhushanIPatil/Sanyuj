import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_IDS = 200;

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const categoryId = String(body.category_id ?? "").trim();
    const ids = Array.isArray(body.ids)
      ? [...new Set(body.ids.map((id: unknown) => String(id ?? "").trim()).filter(Boolean))]
      : [];

    if (!categoryId) return NextResponse.json({ error: "Category is required" }, { status: 400 });
    if (!ids.length) return NextResponse.json({ error: "Select at least one business" }, { status: 400 });
    if (ids.length > MAX_IDS) {
      return NextResponse.json({ error: `You can update at most ${MAX_IDS} businesses at once` }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: category, error: catErr } = await admin
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .maybeSingle();
    if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });

    const { error: patchErr } = await admin.from("businesses").update({ category_id: categoryId }).in("id", ids);
    if (patchErr) return NextResponse.json({ error: patchErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, count: ids.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
