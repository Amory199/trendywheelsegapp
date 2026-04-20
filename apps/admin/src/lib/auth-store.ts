"use client";

import type { User } from "@trendywheels/types";
import { create } from "zustand";

import { api, clearTokens, readToken, ACCESS_KEY, writeTokens } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  loginWithPhone: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  async loginWithPhone(phone, otp) {
    set({ loading: true });
    try {
      const res = await api.verifyOtp(phone, otp);
      writeTokens({ token: res.token, refreshToken: res.refreshToken });
      set({ user: res.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  async logout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    clearTokens();
    set({ user: null });
  },

  async hydrate() {
    if (!readToken(ACCESS_KEY)) {
      set({ initialized: true });
      return;
    }
    try {
      // Fetch current user via /api/users/me — fall back to no-op if endpoint missing
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/users/me`,
        { headers: { Authorization: `Bearer ${readToken(ACCESS_KEY)}` } },
      );
      if (res.ok) {
        const data = (await res.json()) as { data: User };
        set({ user: data.data, initialized: true });
      } else {
        clearTokens();
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },
}));
