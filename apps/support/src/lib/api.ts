"use client";

import { ApiClient } from "@trendywheels/api-client";
import type { AuthTokens } from "@trendywheels/types";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const ACCESS_KEY = "tw_support_access";
const REFRESH_KEY = "tw_support_refresh";

export function readToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export function writeTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, tokens.token);
  window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export const api = new ApiClient({
  baseUrl,
  getAccessToken: async () => readToken(ACCESS_KEY),
  getRefreshToken: async () => readToken(REFRESH_KEY),
  onTokenRefresh: async (tokens) => writeTokens(tokens),
  refreshTokens: async (refreshToken) => {
    const res = await fetch(`${baseUrl}/api/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error("Refresh failed");
    return res.json() as Promise<AuthTokens>;
  },
});

export { baseUrl };
