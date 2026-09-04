/** Payload accepted by the reusable push sender (admin or future event hooks). */
export type PushMessage = {
  title: string;
  body: string;
  /** Optional HTTPS image URL shown by FCM on supported platforms. */
  image?: string | null;
  /** Optional custom data map (string values only — FCM requirement). */
  data?: Record<string, string>;
};

export type DeviceTokenRow = {
  id: string;
  user_id: string;
  device_token: string;
  device_id: string | null;
  device_name: string | null;
  device_os: string | null;
  os_version: string | null;
  app_version: string | null;
  is_active: boolean;
  last_active_at: string;
};

export type RegisterDeviceInput = {
  deviceToken: string;
  deviceId?: string | null;
  deviceName?: string | null;
  deviceOs?: string | null;
  osVersion?: string | null;
  appVersion?: string | null;
};

export type SendPushResult = {
  successCount: number;
  failureCount: number;
  /** Tokens that FCM reported as invalid / unregistered (deactivated by sender). */
  invalidTokens: string[];
};
