import type { AccountType, User } from "@trendywheels/types";
import { create } from "zustand";

import { logEvent, setAnalyticsUser } from "./analytics";
import {
  api,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  registerLogoutHandler,
  setTokens,
} from "./api";
import { getLastPushToken } from "./push";

// The real admin access token, kept in memory while "acting as" another role so
// exit can restore it instantly. Null after a reload — exitActing then falls
// back to refreshing with the admin refresh token (which is never overwritten).
let savedAdminToken: string | null = null;

export interface ActingAs {
  role: AccountType;
  staffRole?: string | null;
}

interface AuthState {
  user: User | null;
  initialized: boolean;
  actingAs: ActingAs | null;
  hydrate: () => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  verifyFirebaseIdToken: (idToken: string) => Promise<void>;
  assumeRole: (role: "customer" | "staff", staffRole?: string) => Promise<void>;
  exitActing: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,
  actingAs: null,

  async hydrate() {
    const token = await getAccessToken();
    if (!token) {
      set({ initialized: true });
      return;
    }
    // The boot screen (app/index.tsx) shows the loading splash while
    // `initialized` is false. A STALLED connection (online but the socket
    // hangs) makes /me neither resolve nor reject, so without this cap
    // `initialized` would stay false forever and the app sits trapped on the
    // splash — the user could only get in by booting OFFLINE (which fails the
    // request fast) then reconnecting. So always release the boot within a few
    // seconds; tokens stay put and a late /me still fills in the user. (INC-045)
    const releaseBoot = setTimeout(() => set({ initialized: true }), 6000);
    try {
      // Go through the ApiClient (not a raw fetch) so an expired access token
      // is transparently refreshed via the stored refresh token. The client
      // only clears tokens (onAuthError) when the session is genuinely dead —
      // a refresh that the server rejected. A transient network/timeout error
      // throws WITHOUT clearing, so a flaky boot keeps the session for the next
      // launch instead of silently logging the user out.
      const res = await api.request<{ data: User }>("GET", "/api/users/me");
      set({
        user: res.data,
        initialized: true,
        // Re-derive acting state so a reload mid-"act as" keeps the banner.
        actingAs: res.data.actingAsAdminId
          ? { role: res.data.accountType, staffRole: res.data.staffRole ?? null }
          : null,
      });
    } catch {
      // Either a dead session (tokens already cleared by onAuthError → user
      // reset to null) or a network blip (tokens preserved, retried next
      // launch). Never clear tokens here.
      set({ initialized: true });
    } finally {
      clearTimeout(releaseBoot);
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

  async loginWithPassword(email, password) {
    const res = await api.loginWithPassword(email, password);
    await setTokens(res.token, res.refreshToken);
    set({ user: res.user });
    setAnalyticsUser(res.user.id);
    logEvent("login", { method: "password" });
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

  // Admin only: assume a customer/staff role. Keeps the admin refresh token in
  // place (setTokens without a refresh arg) so exitActing can always recover.
  async assumeRole(role, staffRole) {
    const current = await getAccessToken();
    const res = await api.assumeRole({ role, staffRole });
    savedAdminToken = current;
    await setTokens(res.token);
    set({ user: res.user, actingAs: { role, staffRole: staffRole ?? null } });
    setAnalyticsUser(res.user.id);
    logEvent("assume_role", { role, staffRole: staffRole ?? "" });
  },

  // Leave the previewed role and restore the real admin session. Prefer the
  // in-memory admin token; after a reload that's gone, so refresh with the
  // admin refresh token (never overwritten while acting) to mint a fresh one.
  async exitActing() {
    set({ actingAs: null });
    if (savedAdminToken) {
      await setTokens(savedAdminToken);
      savedAdminToken = null;
    } else {
      const refresh = await getRefreshToken();
      if (refresh) {
        const tokens = await api.refreshToken(refresh);
        await setTokens(tokens.token, tokens.refreshToken);
      }
    }
    await get().hydrate();
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
    savedAdminToken = null;
    set({ user: null, actingAs: null });
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
registerLogoutHandler((info) => {
  // This fires at the EXACT moment a user is actually forced out — the refresh
  // token was rejected, or there was none to refresh with. Distinct from the
  // benign pre-refresh 401s the client silently recovers from, which never get
  // here. Emit a greppable telemetry event (queryable in error_logs / Sentry)
  // so we can watch the real forced-logout rate and which accounts hit it.
  const prev = useAuth.getState();
  void api.reportClientError({
    source: "mobile",
    level: "warn",
    message: "session_forced_logout",
    route: info?.path,
    metadata: {
      reason: info?.reason ?? "unknown",
      statusCode: info?.statusCode,
      code: info?.code,
      userId: prev.user?.id ?? null,
      wasActingAs: !!prev.actingAs,
    },
  });
  savedAdminToken = null;
  useAuth.setState({ user: null, actingAs: null });
});
