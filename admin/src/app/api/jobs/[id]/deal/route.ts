import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureInterest, finalizeJobDeal, reopenJob } from "@/lib/jobs/deal";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing job id" }, { status: 400 });

  try {
    const body = await req.json();
    const action = String(body.action ?? "assign");
    const admin = createAdminClient();
    const { data: job } = await admin.from("jobs").select("id, category_id").eq("id", id).maybeSingle();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (action === "reopen") {
      await reopenJob(admin, id);
      return NextResponse.json({ ok: true });
    }

    if (action === "close_unassigned") {
      await finalizeJobDeal(admin, id, null);
      return NextResponse.json({ ok: true });
    }

    const businessId = String(body.business_id ?? "").trim();
    if (!businessId) return NextResponse.json({ error: "Select a provider" }, { status: 400 });

    const { data: biz } = await admin
      .from("businesses")
      .select("id, category_id")
      .eq("id", businessId)
      .maybeSingle();
    if (!biz) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    if (job.category_id && biz.category_id && job.category_id !== biz.category_id) {
      return NextResponse.json(
        { error: "Provider must be in the same category as the job" },
        { status: 400 },
      );
    }

    const interestId = await ensureInterest(admin, id, businessId);
    const amountRaw = body.final_amount;
    const finalAmount =
      amountRaw == null || amountRaw === "" ? null : Number(amountRaw);
    await finalizeJobDeal(
      admin,
      id,
      interestId,
      finalAmount != null && Number.isFinite(finalAmount) ? finalAmount : null,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
