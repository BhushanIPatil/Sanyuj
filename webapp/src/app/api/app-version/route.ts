import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { corsPreflight, withCors } from "@/lib/api/cors";

export const runtime = "nodejs";

const PLATFORMS = new Set(["android", "ios"]);

export async function OPTIONS(req: Request) {
  return corsPreflight(req);
}

/** Active store version for a platform — used by the mobile app on startup. */
export async function GET(req: Request) {
  const platform = new URL(req.url).searchParams.get("platform")?.toLowerCase() ?? "";
  if (!PLATFORMS.has(platform)) {
    return withCors(
      req,
      NextResponse.json({ error: "platform must be android or ios" }, { status: 400 }),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_versions")
    .select(
      "id, platform, latest_version, minimum_version, download_url, release_notes, is_active, created_at, updated_at",
    )
    .eq("platform", platform)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return withCors(
      req,
      NextResponse.json({ error: error.message }, { status: 500 }),
    );
  }

  if (!data) {
    return withCors(
      req,
      NextResponse.json({ error: "No active version for platform" }, { status: 404 }),
    );
  }

  return withCors(req, NextResponse.json(data));
}
