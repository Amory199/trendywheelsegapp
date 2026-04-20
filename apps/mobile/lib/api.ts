import { ApiClient } from "@trendywheels/api-client";
import * as SecureStore from "expo-secure-store";

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

export const api = new ApiClient({
  baseUrl,
  getAccessToken,
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_KEY),
  onTokenRefresh: async (tokens) => setTokens(tokens.token, tokens.refreshToken),
  refreshTokens: async (refreshToken) => {
    const res = await fetch(`${baseUrl}/api/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error("Refresh failed");
    return res.json();
  },
});
