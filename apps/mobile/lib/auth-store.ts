import type { User } from "@trendywheels/types";
import { create } from "zustand";

import { api, clearTokens, getAccessToken, setTokens } from "./api";

interface AuthState {
  user: User | null;
  initialized: boolean;
  hydrate: () => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
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
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = (await res.json()) as { data: User };
        set({ user: json.data, initialized: true });
      } else {
        await clearTokens();
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
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

  async logout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    await clearTokens();
    set({ user: null });
  },
}));
