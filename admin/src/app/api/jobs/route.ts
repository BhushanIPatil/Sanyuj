import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const customerId = String(body.customer_id ?? "").trim();
    const categoryId = String(body.category_id ?? "").trim();
    const title = String(body.title ?? "").trim().slice(0, 80);
    const description = String(body.description ?? "").trim();
    const pincode = String(body.pincode ?? "").trim();
    const locality = String(body.locality ?? "").trim();
    const urgency = String(body.urgency ?? "flexible");

    if (!customerId) return NextResponse.json({ error: "Select a customer" }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: "Select a category" }, { status: 400 });
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 });
    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ error: "Enter a valid 6-digit pincode" }, { status: 400 });
    }
    if (!locality) return NextResponse.json({ error: "Locality is required" }, { status: 400 });
    if (!URGENCIES.has(urgency)) return NextResponse.json({ error: "Invalid urgency" }, { status: 400 });

    const admin = createAdminClient();
    const { data: customer } = await admin.from("profiles").select("id").eq("id", customerId).maybeSingle();
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const { data, error } = await admin
      .from("jobs")
      .insert({
        customer_id: customerId,
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
        status: "open",
        is_active: true,
        is_deleted: false,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
