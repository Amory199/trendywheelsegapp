import { ApiClientError } from "@trendywheels/api-client";
import type { AccountType, User } from "@trendywheels/types";
import { router } from "expo-router";
import { create } from "zustand";

import { logEvent, setAnalyticsUser } from "./analytics";
import {
  api,
  clearStashedAdminRefresh,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getStashedAdminRefresh,
  registerLogoutHandler,
  setTokens,
  stashAdminRefresh,
} from "./api";
import { getLastPushToken } from "./push";

// The real admin session, kept in memory while "acting as" another role so exit
// can restore it INSTANTLY (no round-trip). Both are null after an app restart —
// exitActing then falls back to the stashed admin refresh token (persisted in
// SecureStore) to mint a fresh admin session.
let savedAdminToken: string | null = null;
let savedAdminUser: User | null = null;

export interface ActingAs {
  role: AccountType;
  staffRole?: string | null;
}

// Cold-path admin restore: mint a fresh admin session from a persisted refresh
// token (after a restart wiped savedAdminToken). Used by exitActing AND by
// hydrate, which restores the ADMIN at boot instead of booting into the
// previewed role's interface. Outcomes:
//   • "restored" — a candidate minted a session; new tokens are stored.
//   • "dead"     — the server ACTIVELY rejected every candidate (400/401/403)
//                  — the admin session is genuinely gone.
//   • "network"  — some attempt died at the network layer (timeout /
//                  statusCode 0 / fetch failure) with no success. Anything we
//                  can't classify — including 429 rate-limits and 5xx — lands
//                  here too: never destroy a session on an ambiguous error
//                  (INC-032). No candidates at all is also non-destructive:
//                  a live access token keeps working until it expires.
// `abortIfStale` is checked after the refresh resolves but BEFORE tokens are
// persisted — if another session was established while we waited (fresh login
// past the 6s boot release), we must not clobber its tokens.
const REFRESH_REJECTED_CODES = [400, 401, 403];
async function restoreAdminFromRefresh(
  abortIfStale?: () => boolean,
): Promise<"restored" | "dead" | "network"> {
  // De-duped candidates: the stash first (definitely the admin's), then the
  // current stored refresh (in case the stash was rotated mid-session).
  const stashed = await getStashedAdminRefresh();
  const stored = await getRefreshToken();
  const candidates = [stashed, stored].filter((v, i, a): v is string => !!v && a.indexOf(v) === i);
  if (candidates.length === 0) return "network";

  let sawNetworkError = false;
  for (const refresh of candidates) {
    try {
      const tokens = await api.refreshToken(refresh);
      if (abortIfStale?.()) return "network";
      await setTokens(tokens.token, tokens.refreshToken);
      return "restored";
    } catch (err) {
      // Only a definite auth rejection on the pre-auth refresh endpoint marks
      // this candidate dead. TIMEOUT / statusCode 0 / a raw fetch failure — or
      // a 429 / 5xx / unknown error — counts as network trouble.
      const rejected =
        err instanceof ApiClientError && REFRESH_REJECTED_CODES.includes(err.statusCode ?? 0);
      if (!rejected) sawNetworkError = true;
    }
  }
  return sawNetworkError ? "network" : "dead";
}

interface AuthState {
  user: User | null;
  initialized: boolean;
  actingAs: ActingAs | null;
  hydrate: () => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (phone: string) => Promise<void>;
  resetPassword: (phone: string, code: string, password: string) => Promise<void>;
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
    // Only the cold-boot hydrate may auto-restore the admin out of "acting as".
    // Mid-session callers (profile/settings saves re-hydrate to refresh the
    // user) must keep the preview exactly as it is.
    const isBoot = !get().initialized;
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
      if (res.data.actingAsAdminId && isBoot) {
        // Cold start mid-"acting as": restore the REAL admin session before
        // routing, so the admin never boots into the previewed interface.
        // The releaseBoot cap may have already let the user in — and even log
        // in fresh as a DIFFERENT account — while we wait on the network.
        // (/me while acting reports the admin's own id, so a different id can
        // only mean a new login.) Never touch that session.
        const stale = (): boolean => {
          const current = get().user;
          return !!current && current.id !== res.data.id;
        };
        try {
          const outcome = await restoreAdminFromRefresh(stale);
          if (outcome === "restored") {
            try {
              // Now holding an admin token — re-fetch /me for the admin identity.
              const adminRes = await api.request<{ data: User }>("GET", "/api/users/me");
              savedAdminToken = null;
              savedAdminUser = null;
              await clearStashedAdminRefresh();
              if (stale()) return;
              set({ user: adminRes.data, actingAs: null, initialized: true });
              return;
            } catch {
              // Admin tokens are already on disk but we couldn't confirm the
              // identity. Roll the ACCESS token back to the acting one (the
              // stored refresh stays the admin's, exactly as during a normal
              // preview) so the acting UI below never runs on an admin token.
              await setTokens(token);
            }
          }
          if (outcome === "dead" && !get().user) {
            // The admin session is genuinely gone, and the acting session is
            // synthetic — worthless without it. Tear down locally exactly like
            // logout() does (no server call — INC-060) and boot to the guest
            // catalog. No alert at boot.
            await clearTokens();
            savedAdminToken = null;
            savedAdminUser = null;
            await clearStashedAdminRefresh();
            set({ user: null, actingAs: null, initialized: true });
            return;
          }
        } catch {
          // Unexpected failure — treat like a network miss and fall through
          // rather than crashing boot.
        }
        // "network": can't reach the server to restore right now. Fall through
        // to the acting state below — the banner shows and Exit retries online.
        if (stale()) return;
      }
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

  // Kick off a password reset: the server sends a one-time code to the phone
  // (via Akedly, same channel as the login OTP). No session is issued here.
  async requestPasswordReset(phone) {
    await api.request("POST", "/api/auth/forgot-password", { body: { phone } });
  },

  // Complete a password reset with the emailed/SMS code + a new password. The
  // server returns a fresh session, so we persist tokens + user EXACTLY like
  // loginWithPassword — the reset screen auto-lands the now-signed-in user.
  async resetPassword(phone, code, password) {
    const res = await api.request<{ token: string; refreshToken: string; user: User }>(
      "POST",
      "/api/auth/reset-password",
      { body: { phone, code, password } },
    );
    await setTokens(res.token, res.refreshToken);
    set({ user: res.user });
    setAnalyticsUser(res.user.id);
    logEvent("login", { method: "password_reset" });
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
    const currentRefresh = await getRefreshToken();
    const adminUser = get().user;
    const res = await api.assumeRole({ role, staffRole });
    savedAdminToken = current;
    savedAdminUser = adminUser;
    // Persist the admin refresh token so exit can recover the admin session even
    // after an app restart clears the in-memory copies above.
    if (currentRefresh) await stashAdminRefresh(currentRefresh);
    await setTokens(res.token);
    set({ user: res.user, actingAs: { role, staffRole: staffRole ?? null } });
    setAnalyticsUser(res.user.id);
    logEvent("assume_role", { role, staffRole: staffRole ?? "" });
  },

  // Leave the previewed role and restore the real admin session.
  //
  // Order matters: we restore the admin TOKEN *before* clearing `actingAs`, so a
  // failure leaves the banner in place to retry instead of stranding the admin
  // in the previewed interface with no exit button (the reported bug).
  //   • Warm path (no restart): in-memory admin token → instant, no network.
  //   • Cold path (after restart, memory gone): restoreAdminFromRefresh() mints
  //     an admin session from the stashed / stored refresh token.
  // Throws if it cannot restore ("dead" or "network" alike), so the caller can
  // fall back (never stuck).
  async exitActing() {
    let restored = false;

    if (savedAdminToken) {
      await setTokens(savedAdminToken);
      restored = true;
    } else {
      restored = (await restoreAdminFromRefresh()) === "restored";
    }

    if (!restored) {
      throw new Error("Could not restore the admin session");
    }

    savedAdminToken = null;
    await clearStashedAdminRefresh();

    if (savedAdminUser) {
      // Warm: show the admin UI immediately, reconcile with the server in the
      // background so exit feels instant.
      const admin = savedAdminUser;
      savedAdminUser = null;
      set({ actingAs: null, user: admin });
      void get().hydrate();
    } else {
      // Cold: we don't have the cached admin user — fetch it fresh.
      set({ actingAs: null });
      await get().hydrate();
    }
  },

  async logout() {
    try {
      // While ACTING AS someone, the stored refresh token is the ADMIN's — a
      // server-side logout here would revoke the admin's own sessions (the
      // exit-acting stash included) and strand them at relogin. The acting
      // session is synthetic: clearing it locally is a complete logout.
      if (!get().actingAs) {
        // Pass this device's push token so the API unbinds only this device —
        // a shared/handed-over phone must not keep getting the old user's
        // pushes — and this session's refresh token so ONLY this device's
        // session is revoked (other devices stay signed in).
        const refresh = await getRefreshToken();
        await api.logout(getLastPushToken() ?? undefined, refresh ?? undefined);
      }
    } catch {
      /* ignore */
    }
    await clearTokens();
    savedAdminToken = null;
    savedAdminUser = null;
    await clearStashedAdminRefresh();
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
  savedAdminUser = null;
  void clearStashedAdminRefresh();
  useAuth.setState({ user: null, actingAs: null });
  // Land the user on the public catalog immediately. Without this they'd stay
  // on whatever authed screen detected the dead session, which would render its
  // error state ("session expired" / "something went wrong"). The catalog is
  // guest-browsable; account actions re-prompt sign-in at the point of use. So
  // a dead session is silent and clean — never a scary error the user is stuck
  // on, and a reopen (tokens now cleared) boots straight to the catalog too.
  try {
    router.replace("/(tabs)");
  } catch {
    /* navigation not ready (e.g. failure during cold boot) — index.tsx will
       route the now-null user to the catalog once it mounts. */
  }
});
