"use client";

import type { User } from "@trendywheels/types";
import { create } from "zustand";

import { ACCESS_KEY, baseUrl, clearTokens, readToken, writeTokens } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  async loginWithEmail(email, password) {
    set({ loading: true });
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Login failed");
      }
      const data = (await res.json()) as { token: string; refreshToken: string; user: User };
      writeTokens({ token: data.token, refreshToken: data.refreshToken });
      set({ user: data.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout() {
    clearTokens();
    set({ user: null });
  },

  async hydrate() {
    const token = readToken(ACCESS_KEY);
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
