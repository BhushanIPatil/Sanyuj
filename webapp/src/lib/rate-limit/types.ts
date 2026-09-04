/**
 * Isolated rate-limit layer for auth / account APIs.
 *
 * Routes should only import from `@/lib/rate-limit`.
 * To switch to Upstash (or another store), replace the store factory in `index.ts`
 * and keep the same public helpers (`enforceRateLimit`, policies, subjects).
 */

export type RateLimitSubjectType = "email" | "ip" | "user";

export type RateLimitSubject = {
  type: RateLimitSubjectType;
  key: string;
};

/** Stable action ids stored in `api_rate_limits.action` / future Redis prefixes. */
export type RateLimitAction =
  | "register"
  | "send_otp"
  | "forgot_password"
  | "restore"
  | "delete_account"
  | "register_device";

export type RateLimitPolicy = {
  /** Max allowed hits within the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Pluggable backend. Postgres today; Upstash (or memory) can implement the same contract.
 */
export interface RateLimitStore {
  consume(
    action: RateLimitAction,
    subject: RateLimitSubject,
    policy: RateLimitPolicy,
  ): Promise<RateLimitDecision>;
}
