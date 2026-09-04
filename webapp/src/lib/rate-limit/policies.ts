import type { RateLimitAction, RateLimitPolicy } from "./types";

/**
 * Tunable budgets for email / account-sensitive actions.
 * Keep limits here so routes stay free of magic numbers.
 */
export const RATE_LIMIT_POLICIES: Record<RateLimitAction, RateLimitPolicy> = {
  register: { limit: 5, windowSeconds: 60 * 60 },
  send_otp: { limit: 5, windowSeconds: 60 * 60 },
  forgot_password: { limit: 5, windowSeconds: 60 * 60 },
  restore: { limit: 5, windowSeconds: 60 * 60 },
  delete_account: { limit: 3, windowSeconds: 60 * 60 * 24 },
  register_device: { limit: 60, windowSeconds: 60 * 60 },
};
