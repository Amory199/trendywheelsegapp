import { ApiClient } from "@trendywheels/api-client";
import * as SecureStore from "expo-secure-store";

import { useNetwork } from "./network-store";

const ACCESS_KEY = "tw_access";
const REFRESH_KEY = "tw_refresh";

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export async function setTokens(token: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, token);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

// The auth store registers a handler here so a dead session detected deep in a
// request (e.g. the server revoked it after a role change) can reset in-memory
// auth state and bounce the user to login. Kept as a registration to avoid an
// api ⇄ auth-store import cycle.
let onSessionDead: () => void = () => {};
export function registerLogoutHandler(fn: () => void): void {
  onSessionDead = fn;
}

export const api = new ApiClient({
  baseUrl,
  getAccessToken,
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_KEY),
  onTokenRefresh: async (tokens) => setTokens(tokens.token, tokens.refreshToken),
  onAuthError: async () => {
    await clearTokens();
    onSessionDead();
  },
  // Every request outcome doubles as a connectivity probe — drives the
  // offline banner without a native NetInfo module.
  onNetworkStatus: (online) => useNetwork.getState().setOnline(online),
});
