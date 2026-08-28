import { NextResponse } from "next/server";
import { fetchLocalitiesForPincode } from "@/lib/geo/postal";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pincode: string }> },
) {
  const { pincode } = await params;
  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: "Enter a valid 6-digit pincode" }, { status: 400 });
  }

  try {
    const localities = await fetchLocalitiesForPincode(pincode);
    return NextResponse.json({ localities });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not look up pincode";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
