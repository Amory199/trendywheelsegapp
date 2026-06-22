import type { Router } from "expo-router";

import type { useAuth } from "./auth-store";

type AuthUser = ReturnType<typeof useAuth.getState>["user"];

/** True once the customer has both ID sides on file. */
export function hasVerifiedId(user: AuthUser): boolean {
  return Boolean(user?.idFrontUrl && user?.idBackUrl);
}

/**
 * Gate any transaction (rent / buy / reserve / list) on national-ID capture.
 * Returns true when the user already has their ID on file. Otherwise it routes
 * to the verify-id screen with a `next` route (+ params) to resume the original
 * action, and returns false so the caller bails out.
 */
export function ensureId(
  user: AuthUser,
  router: Router,
  next: string,
  params?: Record<string, string>,
): boolean {
  if (hasVerifiedId(user)) return true;
  router.push({
    pathname: "/profile/verify-id",
    params: { next, ...(params ?? {}) },
  } as never);
  return false;
}
