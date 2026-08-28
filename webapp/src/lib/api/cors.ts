import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  // Flutter web debug ports
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

function isDevLocalOrigin(origin: string | null) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Flutter web often uses a random localhost port
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

/** CORS headers so the Flutter web client can call these APIs in local/dev. */
export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin");
  const allow = isDevLocalOrigin(origin) ? origin! : "";
  return {
    ...(allow ? { "Access-Control-Allow-Origin": allow } : {}),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function withCors(req: Request, res: NextResponse) {
  const headers = corsHeaders(req);
  for (const [k, v] of Object.entries(headers)) {
    if (v) res.headers.set(k, v);
  }
  return res;
}

export function corsPreflight(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}
