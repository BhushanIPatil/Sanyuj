import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/admin";
import { corsPreflight, withCors } from "@/lib/api/cors";
import {
  createJobForUser,
  validateCreateJobInput,
  type CreateJobInput,
} from "@/lib/jobs/create";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  return corsPreflight(req);
}

async function resolveUserId(req: Request): Promise<
  { userId: string } | { error: NextResponse }
> {
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const admin = createAdminClient();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) {
      return {
        error: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
      };
    }
    return { userId: data.user.id };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }
  return { userId: user.id };
}

/** Create a job (max one per user per Asia/Kolkata calendar day). */
export async function POST(req: Request) {
  try {
    const auth = await resolveUserId(req);
    if ("error" in auth) return withCors(req, auth.error);

    const body = (await req.json()) as Partial<CreateJobInput>;
    const validationError = validateCreateJobInput(body);
    if (validationError) {
      return withCors(
        req,
        NextResponse.json({ error: validationError }, { status: 400 }),
      );
    }

    const admin = createAdminClient();
    const result = await createJobForUser(admin, auth.userId, {
      categoryId: body.categoryId!,
      title: body.title!,
      description: body.description!,
      pincode: body.pincode!,
      locality: body.locality!,
      areaId: body.areaId,
      area: body.area,
      urgency: body.urgency!,
      budgetMin: body.budgetMin ?? null,
      budgetMax: body.budgetMax ?? null,
    });

    if (!result.ok) {
      return withCors(
        req,
        NextResponse.json(
          { error: result.error, code: result.code },
          { status: result.status },
        ),
      );
    }

    return withCors(req, NextResponse.json({ ok: true, job: result.job }));
  } catch (e) {
    console.error(e);
    return withCors(
      req,
      NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not post job" },
        { status: 500 },
      ),
    );
  }
}
