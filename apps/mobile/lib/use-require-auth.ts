import { useRouter } from "expo-router";
import { useCallback } from "react";

import { useAuth } from "./auth-store";

// Guards an account-based ACTION on an otherwise guest-browsable screen. Call
// the returned function from an onPress: if signed out it routes to phone login
// and returns false (so the caller bails); if signed in it runs `action` (when
// given) and returns true. Browsing stays open — only the action is gated.
//
//   const requireAuth = useRequireAuth();
//   onPress={() => requireAuth(() => doTheThing())}
//
export function useRequireAuth(): (action?: () => void) => boolean {
  const user = useAuth((s) => s.user);
  const router = useRouter();

  return useCallback(
    (action?: () => void): boolean => {
      if (!user) {
        router.push("/(auth)/phone");
        return false;
      }
      action?.();
      return true;
    },
    [user, router],
  );
}
