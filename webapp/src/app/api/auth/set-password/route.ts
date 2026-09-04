import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeEmail } from "@/lib/auth/email";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 6;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email ?? "");
    const password = String(body.password ?? "");
    const accessToken = String(body.access_token ?? "").trim();
    const refreshToken = String(body.refresh_token ?? "").trim();

    if (!email) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 },
      );
    }
    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: "Verify the email code before setting a new password" },
        { status: 400 },
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
    }

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: sessErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessErr) {
      return NextResponse.json(
        { error: "Session expired. Request a new code and try again." },
        { status: 401 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email || user.email.toLowerCase() !== email) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Email does not match verified session" }, { status: 403 });
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password });
    await supabase.auth.signOut();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message || "Could not update password" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
