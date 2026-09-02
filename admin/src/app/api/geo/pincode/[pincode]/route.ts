import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchLocalitiesForPincode } from "@/lib/geo/postal";
import { fetchCachedLocalities, mergeLocalities } from "@/lib/geo/localities";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pincode: string }> },
) {
  const { pincode } = await params;
  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: "Enter a valid 6-digit pincode" }, { status: 400 });
  }

  const supabase = await createClient();
  let cached: Awaited<ReturnType<typeof fetchCachedLocalities>> = [];
  try {
    cached = await fetchCachedLocalities(supabase, pincode);
  } catch {
    cached = [];
  }

  try {
    const api = await fetchLocalitiesForPincode(pincode);
    return NextResponse.json({
      localities: mergeLocalities(api, cached),
      source: cached.length ? "api+cache" : "api",
    });
  } catch (err) {
    if (cached.length) {
      return NextResponse.json({
        localities: mergeLocalities([], cached),
        source: "cache",
      });
    }
    const message = err instanceof Error ? err.message : "Could not look up pincode";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
