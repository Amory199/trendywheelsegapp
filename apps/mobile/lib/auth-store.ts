import type { User } from "@trendywheels/types";
import { create } from "zustand";

import { api, clearTokens, getAccessToken, registerLogoutHandler, setTokens } from "./api";

interface AuthState {
  user: User | null;
  initialized: boolean;
  hydrate: () => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  verifyFirebaseIdToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  initialized: false,

  async hydrate() {
    const token = await getAccessToken();
    if (!token) {
      set({ initialized: true });
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (res.ok) {
        const json = (await res.json()) as { data: User };
        set({ user: json.data, initialized: true });
      } else {
        await clearTokens();
        set({ initialized: true });
      }
    } catch {
      await clearTokens();
      set({ initialized: true });
    } finally {
      clearTimeout(timeout);
    }
  },

  async sendOtp(phone) {
    await api.sendOtp(phone);
  },

  async verifyOtp(phone, otp) {
    const res = await api.verifyOtp(phone, otp);
    await setTokens(res.token, res.refreshToken);
    set({ user: res.user });
  },

  async verifyFirebaseIdToken(idToken) {
    const res = await api.request<{ token: string; refreshToken: string; user: User }>(
      "POST",
      "/api/auth/firebase-token",
      { body: { idToken } },
    );
    await setTokens(res.token, res.refreshToken);
    set({ user: res.user });
  },

  async logout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    await clearTokens();
    set({ user: null });
  },

  setUser(user) {
    set({ user });
  },
}));

// When a request hits an unrecoverable 401 (the server revoked this session
// after a role/status change), the api layer clears tokens and calls this to
// drop the in-memory user — bouncing the app straight back to the login screen.
registerLogoutHandler(() => useAuth.setState({ user: null }));
