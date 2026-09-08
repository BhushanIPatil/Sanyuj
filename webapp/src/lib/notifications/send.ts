import type { SupabaseClient } from "@supabase/supabase-js";
import { getFirebaseMessaging } from "./firebase";
import {
  deactivateInvalidTokens,
  listActiveTokens,
} from "./devices";
import type { PushMessage, SendPushResult } from "./types";

const FCM_BATCH_SIZE = 500;

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
]);

function normalizeImageUrl(raw: string | null | undefined): string | undefined {
  const url = raw?.trim();
  if (!url) return undefined;
  // FCM only downloads HTTPS images (< ~1MB) for rich notifications.
  if (!/^https:\/\//i.test(url)) return undefined;
  return url;
}

/**
 * Low-level: send a push to an explicit list of FCM tokens.
 * Safe to call from admin broadcast or future job/interest/deal hooks.
 *
 * Always include a `notification` payload so Android/iOS show a tray item even
 * when the app is backgrounded or killed. Data-only messages are accepted by
 * FCM (successCount > 0) but many OEM devices never deliver them to Flutter.
 * `data` is kept so the in-app handler can render a rich image when the app
 * is in the foreground.
 */
export const ANDROID_NOTIFICATION_CHANNEL_ID = "sanyuj_default";

export async function sendPushToTokens(
  adminDb: SupabaseClient,
  tokens: string[],
  message: PushMessage,
): Promise<SendPushResult> {
  const unique = [...new Set(tokens.map((t) => t.trim()).filter(Boolean))];
  if (!unique.length) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const messaging = getFirebaseMessaging();
  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];

  const imageUrl = normalizeImageUrl(message.image ?? undefined);

  const data: Record<string, string> = {
    ...(message.data ?? {}),
    title: message.title,
    body: message.body,
  };
  if (imageUrl) data.image = imageUrl;

  const notification = {
    title: message.title,
    body: message.body,
    ...(imageUrl ? { imageUrl } : {}),
  };

  for (let i = 0; i < unique.length; i += FCM_BATCH_SIZE) {
    const batch = unique.slice(i, i + FCM_BATCH_SIZE);
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      notification,
      data,
      android: {
        priority: "high",
        notification: {
          channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
          sound: "default",
          ...(imageUrl ? { imageUrl } : {}),
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
          ...(imageUrl ? { "mutable-content": "1" } : {}),
        },
        payload: {
          aps: {
            alert: {
              title: message.title,
              body: message.body,
            },
            sound: "default",
            mutableContent: Boolean(imageUrl),
          },
        },
        fcmOptions: imageUrl ? { imageUrl } : undefined,
      },
      webpush: {
        ...(imageUrl ? { headers: { image: imageUrl } } : {}),
        notification: {
          title: message.title,
          body: message.body,
          ...(imageUrl ? { image: imageUrl } : {}),
        },
      },
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((res, idx) => {
      if (res.success) return;
      const code = res.error?.code ?? "";
      if (INVALID_TOKEN_CODES.has(code)) {
        invalidTokens.push(batch[idx]!);
      }
    });
  }

  if (invalidTokens.length) {
    await deactivateInvalidTokens(adminDb, invalidTokens);
  }

  return { successCount, failureCount, invalidTokens };
}

/** Send to all active devices for the given user ids. */
export async function sendPushToUsers(
  adminDb: SupabaseClient,
  userIds: string[],
  message: PushMessage,
): Promise<SendPushResult> {
  const tokens = await listActiveTokens(adminDb, { userIds });
  return sendPushToTokens(adminDb, tokens, message);
}

/** Broadcast to every active device token. */
export async function broadcastPush(
  adminDb: SupabaseClient,
  message: PushMessage,
): Promise<SendPushResult> {
  const tokens = await listActiveTokens(adminDb);
  return sendPushToTokens(adminDb, tokens, message);
}

/**
 * Load a `push_notifications` row, broadcast it, then stamp sent_* fields.
 * Used by the admin "Send" action today; event hooks can call broadcastPush / sendPushToUsers directly.
 */
export async function sendStoredNotification(
  adminDb: SupabaseClient,
  notificationId: string,
  sentBy: string,
): Promise<SendPushResult & { notificationId: string }> {
  const { data: row, error } = await adminDb
    .from("push_notifications")
    .select("id, title, message_body, image, sent_datetime, sent_by")
    .eq("id", notificationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("Notification not found");

  const result = await broadcastPush(adminDb, {
    title: row.title as string,
    body: row.message_body as string,
    image: (row.image as string | null) ?? null,
    data: {
      notification_id: row.id as string,
      type: "admin_broadcast",
    },
  });

  const { error: updErr } = await adminDb
    .from("push_notifications")
    .update({
      sent_datetime: result.successCount > 0 ? new Date().toISOString() : row.sent_datetime,
      sent_count: result.successCount,
      sent_by: result.successCount > 0 ? sentBy : row.sent_by,
    })
    .eq("id", notificationId);

  if (updErr) throw new Error(updErr.message);

  return { ...result, notificationId };
}
