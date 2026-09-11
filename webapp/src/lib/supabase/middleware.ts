import { NextResponse, type NextRequest } from "next/server";
/** Retired public auth URLs are aliases; never refresh customer sessions. */
export async function updateSession(request: NextRequest) {
  const response = request.nextUrl.pathname.startsWith("/auth/")
    ? NextResponse.redirect(new URL("/app/offerly", request.url))
    : NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    const key = "sb-" + new URL(url).hostname.split(".")[0] + "-auth-token";
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name === key || cookie.name.startsWith(key + ".") || cookie.name === key + "-code-verifier") response.cookies.delete(cookie.name);
    }
  }
  return response;
}
