import type { RateLimitSubject, RateLimitSubjectType } from "./types";

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export function emailSubject(email: string): RateLimitSubject {
  return { type: "email", key: email.trim().toLowerCase() };
}

export function ipSubject(req: Request): RateLimitSubject {
  return { type: "ip", key: clientIp(req) };
}

export function userSubject(userId: string): RateLimitSubject {
  return { type: "user", key: userId };
}

export function subjects(
  ...parts: Array<RateLimitSubject | null | undefined>
): RateLimitSubject[] {
  const out: RateLimitSubject[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    if (!part?.key) continue;
    const key = `${part.type}:${part.key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out;
}

export function isSubjectType(value: string): value is RateLimitSubjectType {
  return value === "email" || value === "ip" || value === "user";
}
