import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
};

/**
 * Parse FIREBASE_SERVICE_ACCOUNT_JSON from env.
 * Accepts raw JSON or base64-encoded JSON (useful when private_key newlines are awkward).
 */
export function parseFirebaseServiceAccount(): ServiceAccountJson {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  }
  try {
    if (raw.startsWith("{")) {
      return JSON.parse(raw) as ServiceAccountJson;
    }
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(decoded) as ServiceAccountJson;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON or base64 JSON");
  }
}

let cachedApp: App | null = null;

export function getFirebaseApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }

  const sa = parseFirebaseServiceAccount();
  if (!sa.project_id || !sa.client_email || !sa.private_key) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON must include project_id, client_email, and private_key",
    );
  }

  cachedApp = initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: String(sa.private_key).replace(/\\n/g, "\n"),
    }),
    projectId: sa.project_id,
  });
  return cachedApp;
}

export function getFirebaseMessaging(): Messaging {
  return getMessaging(getFirebaseApp());
}
