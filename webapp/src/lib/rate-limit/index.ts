import { NextResponse } from "next/server";
import { RATE_LIMIT_POLICIES } from "./policies";
import { createPostgresRateLimitStore } from "./postgres-store";
import type {
  RateLimitAction,
  RateLimitDecision,
  RateLimitStore,
  RateLimitSubject,
} from "./types";

export type { RateLimitAction, RateLimitDecision, RateLimitSubject, RateLimitStore };
export { RATE_LIMIT_POLICIES } from "./policies";
export {
  clientIp,
  emailSubject,
  ipSubject,
  subjects,
  userSubject,
} from "./subjects";

/**
 * Active store. Swap this factory when moving to Upstash / another provider.
 */
function getStore(): RateLimitStore {
  return createPostgresRateLimitStore();
}

/**
 * Consume one hit for each subject under the same action policy.
 * Blocks if any subject is over limit (email AND ip both enforced when provided).
 *
 * On store failure: fail-open (allow) so a DB blip does not brick auth,
 * but log loudly for ops.
 */
export async function enforceRateLimit(
  action: RateLimitAction,
  subjectList: RateLimitSubject[],
): Promise<RateLimitDecision | { allowed: true; remaining: number; retryAfterSeconds: 0 }> {
  const policy = RATE_LIMIT_POLICIES[action];
  const store = getStore();
  let tightest: RateLimitDecision = {
    allowed: true,
    remaining: policy.limit,
    retryAfterSeconds: 0,
  };

  try {
    for (const subject of subjectList) {
      if (!subject.key) continue;
      const decision = await store.consume(action, subject, policy);
      if (!decision.allowed) {
        return decision;
      }
      if (decision.remaining < tightest.remaining) {
        tightest = decision;
      }
    }
    return tightest;
  } catch (err) {
    console.error("[rate-limit] store error (fail-open):", err);
    return { allowed: true, remaining: policy.limit, retryAfterSeconds: 0 };
  }
}

/** Standard 429 body for webapp + mobile clients. */
export function rateLimitExceededResponse(decision: RateLimitDecision): NextResponse {
  const retryAfter = Math.max(1, decision.retryAfterSeconds || 60);
  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": String(Math.max(0, decision.remaining)),
      },
    },
  );
}

/**
 * Convenience for route handlers: returns a 429 NextResponse, or null if allowed.
 */
export async function rejectIfRateLimited(
  action: RateLimitAction,
  subjectList: RateLimitSubject[],
): Promise<NextResponse | null> {
  const decision = await enforceRateLimit(action, subjectList);
  if (decision.allowed) return null;
  return rateLimitExceededResponse(decision);
}
