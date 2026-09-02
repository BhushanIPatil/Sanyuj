import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Phone OTP auth has been removed — use email + password via /api/auth/login|register. */
export async function POST() {
  return NextResponse.json(
    {
      error: "Phone OTP sign-in is no longer available. Please sign in with email and password.",
    },
    { status: 410 },
  );
}
