/** Payload accepted by the reusable push sender (admin or future event hooks). */
export type PushMessage = {
  title: string;
  body: string;
  /** Optional HTTPS image URL shown by FCM on supported platforms. */
  image?: string | null;
  /** Optional custom data map (string values only — FCM requirement). */
  data?: Record<string, string>;
};

export type SendPushResult = {
  successCount: number;
  failureCount: number;
  /** Tokens that FCM reported as invalid / unregistered (deactivated by sender). */
  invalidTokens: string[];
};
