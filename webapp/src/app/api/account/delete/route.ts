import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/admin";
import { softDeleteUserData } from "@/lib/auth/account";
import {
  ipSubject,
  rejectIfRateLimited,
  subjects,
  userSubject,
} from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const admin = createAdminClient();
    let userId: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) {
        return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      }
      userId = data.user.id;

      const limited = await rejectIfRateLimited(
        "delete_account",
        subjects(userSubject(userId), ipSubject(req)),
      );
      if (limited) return limited;
    } else {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      }
      userId = user.id;

      const limited = await rejectIfRateLimited(
        "delete_account",
        subjects(userSubject(userId), ipSubject(req)),
      );
      if (limited) return limited;

      await supabase.auth.signOut();
    }

    await softDeleteUserData(admin, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not delete account" },
      { status: 500 },
    );
  }
}
