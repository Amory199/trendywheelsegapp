import type { User } from "@trendywheels/types";
import { create } from "zustand";

import { logEvent, setAnalyticsUser } from "./analytics";
import { api, clearTokens, getAccessToken, registerLogoutHandler, setTokens } from "./api";
import { getLastPushToken } from "./push";

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
    try {
      // Go through the ApiClient (not a raw fetch) so an expired access token
      // is transparently refreshed via the stored refresh token. The client
      // only clears tokens (onAuthError) when the session is genuinely dead —
      // a refresh that the server rejected. A transient network/timeout error
      // throws WITHOUT clearing, so a flaky boot keeps the session for the next
      // launch instead of silently logging the user out.
      const res = await api.request<{ data: User }>("GET", "/api/users/me");
      set({ user: res.data, initialized: true });
    } catch {
      // Either a dead session (tokens already cleared by onAuthError → user
      // reset to null) or a network blip (tokens preserved, retried next
      // launch). Never clear tokens here.
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
    setAnalyticsUser(res.user.id);
    logEvent("login", { method: "trial_otp" });
  },

  async verifyFirebaseIdToken(idToken) {
    const res = await api.request<{ token: string; refreshToken: string; user: User }>(
      "POST",
      "/api/auth/firebase-token",
      { body: { idToken } },
    );
    await setTokens(res.token, res.refreshToken);
    set({ user: res.user });
    setAnalyticsUser(res.user.id);
    logEvent("login", { method: "firebase_phone" });
  },

  async logout() {
    try {
      // Pass this device's push token so the API unbinds only this device —
      // a shared/handed-over phone must not keep getting the old user's pushes.
      await api.logout(getLastPushToken() ?? undefined);
    } catch {
      /* ignore */
    }
    await clearTokens();
    set({ user: null });
    setAnalyticsUser(null);
    logEvent("sign_out");
  },

  setUser(user) {
    set({ user });
  },
}));

// When a request hits an unrecoverable 401 (the server revoked this session
// after a role/status change), the api layer clears tokens and calls this to
// drop the in-memory user — bouncing the app straight back to the login screen.
registerLogoutHandler(() => useAuth.setState({ user: null }));
