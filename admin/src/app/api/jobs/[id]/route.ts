import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { softDeleteJob } from "@/lib/jobs/deal";

export const runtime = "nodejs";

const URGENCIES = new Set(["today", "this_week", "flexible"]);

function emptyToNull(value: unknown) {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function parseBudget(value: unknown) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing job id" }, { status: 400 });

  try {
    const body = await req.json();
    const categoryId = String(body.category_id ?? "").trim();
    const title = String(body.title ?? "").trim().slice(0, 80);
    const description = String(body.description ?? "").trim();
    const pincode = String(body.pincode ?? "").trim();
    const locality = String(body.locality ?? "").trim();
    const urgency = String(body.urgency ?? "flexible");

    if (!categoryId) return NextResponse.json({ error: "Select a category" }, { status: 400 });
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 });
    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ error: "Enter a valid 6-digit pincode" }, { status: 400 });
    }
    if (!locality) return NextResponse.json({ error: "Locality is required" }, { status: 400 });
    if (!URGENCIES.has(urgency)) return NextResponse.json({ error: "Invalid urgency" }, { status: 400 });

    const admin = createAdminClient();
    const { data: current } = await admin.from("jobs").select("id").eq("id", id).maybeSingle();
    if (!current) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const { error } = await admin
      .from("jobs")
      .update({
        category_id: categoryId,
        title,
        description,
        budget_min: parseBudget(body.budget_min),
        budget_max: parseBudget(body.budget_max),
        urgency,
        pincode,
        locality,
        area: emptyToNull(body.area),
        area_id: emptyToNull(body.area_id),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
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
  if (!id) return NextResponse.json({ error: "Missing job id" }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { data: current } = await admin.from("jobs").select("id").eq("id", id).maybeSingle();
    if (!current) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    await softDeleteJob(admin, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
