/**
 * Isolated push-notification layer.
 *
 * - Devices: upsert / deactivate FCM tokens
 * - Send: sendPushToTokens / sendPushToUsers / broadcastPush
 * - Admin: sendStoredNotification for rows in `push_notifications`
 *
 * Routes should import from `@/lib/notifications` only.
 */

export type {
  DeviceTokenRow,
  PushMessage,
  RegisterDeviceInput,
  SendPushResult,
} from "./types";

export {
  upsertDeviceToken,
  deactivateDeviceToken,
  deactivateDeviceTokensForUser,
  listActiveTokens,
  deactivateInvalidTokens,
} from "./devices";

export {
  sendPushToTokens,
  sendPushToUsers,
  broadcastPush,
  sendStoredNotification,
} from "./send";

export { getFirebaseApp, getFirebaseMessaging, parseFirebaseServiceAccount } from "./firebase";
