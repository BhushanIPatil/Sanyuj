import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { restoreBusiness } from "@/lib/auth/business";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing business id" }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { data: current } = await admin.from("businesses").select("id").eq("id", id).maybeSingle();
    if (!current) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    await restoreBusiness(admin, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
