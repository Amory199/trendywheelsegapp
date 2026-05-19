import { initializeApp, getApps, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

import { env } from "../config/env.js";
import { logger } from "./logger.js";

let app: App | null = null;
let initialized = false;

/**
 * Initialize firebase-admin in token-verification-only mode. Verifying Firebase
 * ID tokens does not require a service account — it only needs the project ID.
 * Public keys are fetched from securetoken.google.com at verify-time.
 *
 * If FIREBASE_PROJECT_ID isn't set, verification is disabled and the
 * /api/auth/firebase-token endpoint will reject all requests. Safer than
 * silently accepting unverified tokens.
 */
export function initFirebase(): void {
  if (initialized) return;
  if (!env.FIREBASE_PROJECT_ID) {
    logger.info("Firebase Admin disabled (no FIREBASE_PROJECT_ID configured)");
    return;
  }
  if (getApps().length === 0) {
    // Project-id-only init. ID-token verification fetches Google's public certs
    // from securetoken.google.com; no service account / ADC required.
    app = initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  } else {
    app = getApps()[0];
  }
  initialized = true;
  logger.info({ projectId: env.FIREBASE_PROJECT_ID }, "Firebase Admin initialized");
}

export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  initFirebase();
  if (!initialized) {
    throw new Error("Firebase Admin is not configured");
  }
  // checkRevoked=false: revocation check requires admin credentials (Auth Admin
  // API); we run project-id-only. Tokens are short-lived (1h) so the risk
  // window is small.
  return getAuth().verifyIdToken(idToken);
}

export function isFirebaseEnabled(): boolean {
  initFirebase();
  return initialized;
}
