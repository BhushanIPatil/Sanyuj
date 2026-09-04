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
 * Android: data-only + high priority so Flutter can download `image` and show
 * a BigPicture notification (OEM battery savers often block FCM's own fetch).
 * iOS: APNs alert + mutable-content + fcmOptions.imageUrl.
 */
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

  for (let i = 0; i < unique.length; i += FCM_BATCH_SIZE) {
    const batch = unique.slice(i, i + FCM_BATCH_SIZE);
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      data,
      // No top-level `notification` — keeps Android in data-message mode so our
      // Flutter handler can render the image. iOS uses `apns.payload.aps.alert`.
      android: {
        priority: "high",
        // Data-only on Android so Flutter downloads `image` and shows BigPicture.
        // (System-tray FCM image fetch is often blocked by OEM battery savers.)
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
      webpush: imageUrl
        ? {
            headers: { image: imageUrl },
            notification: {
              title: message.title,
              body: message.body,
              image: imageUrl,
            },
          }
        : undefined,
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
    .select("id, title, message_body, image, sent_datetime")
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
      sent_datetime: new Date().toISOString(),
      sent_count: result.successCount,
      sent_by: sentBy,
    })
    .eq("id", notificationId);

  if (updErr) throw new Error(updErr.message);

  return { ...result, notificationId };
}
