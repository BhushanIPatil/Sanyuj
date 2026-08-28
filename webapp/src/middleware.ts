import { type NextRequest, NextResponse } from "next/server";
import { corsHeaders, corsPreflight } from "@/lib/api/cors";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return corsPreflight(request);
    }
    const response = NextResponse.next({ request });
    const headers = corsHeaders(request);
    for (const [k, v] of Object.entries(headers)) {
      if (v) response.headers.set(k, v);
    }
    return response;
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
