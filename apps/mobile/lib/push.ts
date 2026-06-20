import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Last token we registered this session — passed to logout so the API can
// unbind exactly this device's push registration.
let lastPushToken: string | null = null;

export function getLastPushToken(): string | null {
  return lastPushToken;
}

/**
 * Ensure the OS notification channel exists and the user has been *asked* for
 * permission. Returns whether it's granted. Safe to call before login (no auth
 * needed) so every user gets the in-app prompt on first launch, not just after
 * they sign in. Never throws — push must never crash the boot path.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    // requestPermissionsAsync shows the system dialog when status is
    // undetermined (Android 13+ POST_NOTIFICATIONS / iOS alert prompt).
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

/**
 * Register for push notifications and POST the Expo token to the API. Idempotent
 * — safe to call on every foreground. Silently no-ops on simulators / when
 * permissions are denied so it never throws into the boot path.
 */
export async function registerPushToken(): Promise<void> {
  try {
    if (!(await ensureNotificationPermission())) return;

    const projectId =
      (Constants?.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
      (Constants?.easConfig as { projectId?: string } | undefined)?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResp.data;
    if (!token) return;
    lastPushToken = token;

    await api.request("POST", "/api/notifications/push-tokens", {
      body: { token, platform: Platform.OS },
    });
  } catch {
    /* no-op — push registration must never crash the app */
  }
}
