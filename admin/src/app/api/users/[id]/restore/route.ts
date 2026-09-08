import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { restoreUserData } from "@/lib/auth/account";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { data: current } = await admin.from("profiles").select("id").eq("id", id).maybeSingle();
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });
    await restoreUserData(admin, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
