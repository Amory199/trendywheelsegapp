import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { LanguageGate } from "../components/LanguageGate";
import { MobileIntro } from "../components/MobileIntro";
import { OfflineBanner } from "../components/OfflineBanner";
import { UpdateGate } from "../components/UpdateGate";
import { initAppCheck } from "../lib/app-check";
import { useAuth } from "../lib/auth-store";
import { installMobileErrorReporter } from "../lib/error-reporter";
import { routeNotification } from "../lib/notification-router";
import { ensureNotificationPermission, registerPushToken } from "../lib/push";
import { initMobileSentry } from "../lib/sentry";

// Wrap in try/catch — nothing at module-load should ever block first paint.
try {
  installMobileErrorReporter();
} catch {
  // never let error reporting break boot
}

// Kick off App Check attestation as early as possible so a token is ready
// before the first phone-auth call. Fire-and-forget; it self-guards.
void initAppCheck();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout(): JSX.Element {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  // Ask for notification permission in-app on first launch — independent of
  // login, so guests and staff alike actually get the system prompt. Delayed
  // slightly so the dialog doesn't collide with the cold-start splash.
  useEffect(() => {
    const t = setTimeout(() => void ensureNotificationPermission(), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (user?.id) void registerPushToken();
  }, [user?.id]);

  // Sentry init DEFERRED past first paint — the old SDK-53 native-init hang
  // froze the splash screen; even if that ever regresses, boot stays safe.
  useEffect(() => {
    const timer = setTimeout(() => initMobileSentry(), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Tap dispatch for ALL push types. Routing is centralised in
  // lib/notification-router.ts so adding a new type means one map entry there
  // — not extra branching here. We also drain the cold-start response (the
  // tap that opened the app from a killed state) so deep-links work even when
  // the listener was registered after the OS delivered the notification.
  useEffect(() => {
    const navigate = (data: Record<string, unknown> | null | undefined): void => {
      const route = routeNotification(data, user);
      if (route) router.push(route as never);
    };

    Notifications.getLastNotificationResponseAsync()
      .then((resp) => {
        const data = resp?.notification.request.content.data as
          | Record<string, unknown>
          | null
          | undefined;
        navigate(data);
      })
      .catch(() => {
        /* no-op — cold-start drain must never crash boot */
      });

    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as
        | Record<string, unknown>
        | null
        | undefined;
      navigate(data);
    });
    return () => sub.remove();
  }, [router, user]);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
              // One coherent horizontal push for the whole detail hierarchy
              // (rent/buy/sell flows, profile sub-pages, messages, …) plus
              // edge swipe-back. Native-screen driven, so it's OTA-safe.
              animation: "slide_from_right",
              gestureEnabled: true,
              // Chevron-only back button. Otherwise iOS labels it with the
              // previous screen's title — which for id-based titles (order
              // ids, ticket "#abc123", vehicle names) reads as a junk string.
              headerBackButtonDisplayMode: "minimal",
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* Search is an overlay, not a deeper page — rise it from the
                bottom so it reads as a sheet, not a drill-down. */}
            <Stack.Screen name="search" options={{ animation: "slide_from_bottom" }} />
          </Stack>
          <OfflineBanner />
          <UpdateGate />
          {/* Branded cold-start intro, then (first launch only) the language
              gate on top of it — both above the app, gate wins z-order. */}
          <MobileIntro />
          <LanguageGate />
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
