import { ApiClient } from "@trendywheels/api-client";
import * as SecureStore from "expo-secure-store";

import { useNetwork } from "./network-store";

const ACCESS_KEY = "tw_access";
const REFRESH_KEY = "tw_refresh";
// While an admin is "acting as" another role, we stash their real refresh token
// here so exit can always restore the admin session — even after an app restart
// wipes the in-memory copy. Persisted (SecureStore) so it survives cold starts.
const ADMIN_REFRESH_KEY = "tw_admin_refresh";

export async function stashAdminRefresh(token: string): Promise<void> {
  await SecureStore.setItemAsync(ADMIN_REFRESH_KEY, token);
}

export async function getStashedAdminRefresh(): Promise<string | null> {
  return SecureStore.getItemAsync(ADMIN_REFRESH_KEY);
}

export async function clearStashedAdminRefresh(): Promise<void> {
  await SecureStore.deleteItemAsync(ADMIN_REFRESH_KEY);
}

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
