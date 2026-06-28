import { ApiClient } from "@trendywheels/api-client";
import { documentDirectory, getInfoAsync, writeAsStringAsync } from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";

import { useNetwork } from "./network-store";

const ACCESS_KEY = "tw_access";
const REFRESH_KEY = "tw_refresh";
// Lives in the app document directory, which IS wiped on uninstall (unlike the
// iOS Keychain that backs SecureStore). Its absence on boot ⇒ fresh install.
const INSTALL_MARKER = `${documentDirectory ?? ""}tw-install.marker`;

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export async function setTokens(token: string, refreshToken?: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, token);
  // Only rewrite the refresh token when a new one is actually issued. Guards
  // against SecureStore throwing on an undefined value (it rejects non-strings)
  // and preserves the existing refresh token if a response omits it.
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  }
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

// The iOS Keychain (where expo-secure-store stores tokens) SURVIVES an app
// uninstall, so a reinstall silently restores the previous session — including
// a stale token for an account that was deleted/anonymized server-side, which
// then 401s into a confusing forced logout. Reinstalling was also the user's
// mental "reset" and it quietly didn't reset anything. The document directory,
// by contrast, IS wiped on uninstall, so on the first boot after an install the
// marker file is missing: treat that as a fresh install, clear any leftover
// Keychain tokens, and drop the marker so we only do this once. Guarantees a
// reinstall starts from a clean, logged-out slate. (INC-055)
export async function purgeTokensIfFreshInstall(): Promise<void> {
  try {
    if (!documentDirectory) return; // e.g. web — no document dir to key off of
    const info = await getInfoAsync(INSTALL_MARKER);
    if (!info.exists) {
      await clearTokens();
      await writeAsStringAsync(INSTALL_MARKER, "1");
    }
  } catch {
    /* never let the install-marker check block app boot */
  }
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

// Identifies WHY a session was force-ended, so genuine forced logouts can be
// told apart from the benign pre-refresh 401s the client recovers from.
export interface SessionDeadInfo {
  reason: string;
  statusCode?: number;
  code?: string;
  path?: string;
}

// The auth store registers a handler here so a dead session detected deep in a
// request (e.g. the server revoked it after a role change) can reset in-memory
// auth state and bounce the user to login. Kept as a registration to avoid an
// api ⇄ auth-store import cycle. The handler owns telemetry (it has the user).
let onSessionDead: (info?: SessionDeadInfo) => void = () => {};
export function registerLogoutHandler(fn: (info?: SessionDeadInfo) => void): void {
  onSessionDead = fn;
}

export const api = new ApiClient({
  baseUrl,
  getAccessToken,
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_KEY),
  onTokenRefresh: async (tokens) => setTokens(tokens.token, tokens.refreshToken),
  onAuthError: async (info) => {
    await clearTokens();
    onSessionDead(info);
  },
  // Every request outcome doubles as a connectivity probe — drives the
  // offline banner without a native NetInfo module.
  onNetworkStatus: (online) => useNetwork.getState().setOnline(online),
});
