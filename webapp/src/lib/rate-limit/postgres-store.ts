import { createAdminClient } from "@/lib/auth/admin";
import type {
  RateLimitAction,
  RateLimitDecision,
  RateLimitPolicy,
  RateLimitStore,
  RateLimitSubject,
} from "./types";

type RpcResult = {
  allowed?: boolean;
  remaining?: number;
  retry_after_seconds?: number;
};

/**
 * Postgres-backed store using `check_and_consume_rate_limit`.
 * Isolated so it can be replaced with Upstash without touching route handlers.
 */
export function createPostgresRateLimitStore(): RateLimitStore {
  return {
    async consume(
      action: RateLimitAction,
      subject: RateLimitSubject,
      policy: RateLimitPolicy,
    ): Promise<RateLimitDecision> {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc("check_and_consume_rate_limit", {
        p_action: action,
        p_subject_type: subject.type,
        p_subject_key: subject.key,
        p_limit: policy.limit,
        p_window_seconds: policy.windowSeconds,
      });

      if (error) {
        throw new Error(error.message || "Rate limit check failed");
      }

      const row = (data ?? {}) as RpcResult;
      return {
        allowed: row.allowed !== false,
        remaining: typeof row.remaining === "number" ? row.remaining : 0,
        retryAfterSeconds:
          typeof row.retry_after_seconds === "number" ? row.retry_after_seconds : 0,
      };
    },
  };
}
