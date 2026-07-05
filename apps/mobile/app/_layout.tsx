import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiClientError } from "@trendywheels/api-client";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ActingBanner } from "../components/ActingBanner";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { LanguageGate } from "../components/LanguageGate";
import { MobileIntro } from "../components/MobileIntro";
import { OfflineBanner } from "../components/OfflineBanner";
import { UpdateGate } from "../components/UpdateGate";
import { initAppCheck } from "../lib/app-check";
import { useAuth } from "../lib/auth-store";
import { installMobileErrorReporter, reportClientError } from "../lib/error-reporter";
import { initOtaTelemetry } from "../lib/instrument-ota";
import { routeNotification } from "../lib/notification-router";
import { ensureNotificationPermission, initPushHandler, registerPushToken } from "../lib/push";
import { initMobileSentry } from "../lib/sentry";
import { useTheme } from "../lib/use-theme";

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
  // Any query error that a screen doesn't surface itself still lands in the
  // error log, so campaign-time failures are never silently swallowed.
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Auth deaths are already captured by the session_forced_logout telemetry
      // and aren't actionable bugs — don't double-log them as query errors.
      if (
        error instanceof ApiClientError &&
        (error.code === "SESSION_EXPIRED" || error.code === "REFRESH_FAILED")
      ) {
        return;
      }
      reportClientError({
        level: "error",
        message: `query failed: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        metadata: { queryKey: query.queryKey },
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Retry transient failures only. A dead session (SESSION_EXPIRED / 401) or
      // any 4xx is NOT transient — retrying it just re-fires the logout path and
      // prolongs the error on screen. The auth layer already bounces the user to
      // the catalog; let that happen on the first failure.
      retry: (failureCount, error) => {
        if (error instanceof ApiClientError) {
          if (error.code === "SESSION_EXPIRED" || error.code === "REFRESH_FAILED") return false;
          if (error.statusCode >= 400 && error.statusCode < 500) return false;
        }
        return failureCount < 2;
      },
      // When the connection comes back (OfflineBanner clears), pull fresh data
      // automatically so the user never lingers on stale content.
      refetchOnReconnect: true,
    },
    mutations: {
      // A single network blip on a money path (checkout / reserve / book)
      // shouldn't fail the customer — retry once with a short backoff before
      // the screen's own onError shows a friendly message.
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    },
  },
});

export default function RootLayout(): JSX.Element {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const { palette } = useTheme();
  // Ask for notification permission in-app on first launch — independent of
  // login, so guests and staff alike actually get the system prompt. Delayed
  // slightly so the dialog doesn't collide with the cold-start splash.
  useEffect(() => {
    // Install the notification handler after first paint (not at module load,
    // where a native call would run before the error reporters are ready).
    initPushHandler();
    const t = setTimeout(() => void ensureNotificationPermission(), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (user?.id) void registerPushToken();
  }, [user?.id]);

  // Sentry init DEFERRED past first paint — the old SDK-53 native-init hang
  // froze the splash screen; even if that ever regresses, boot stays safe.
  useEffect(() => {
    const timer = setTimeout(() => {
      initMobileSentry();
      // Report which OTA bundle this device actually booted (publish ≠ delivered).
      initOtaTelemetry();
    }, 1500);
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
              // Paint the scene container in the theme background so a screen
              // that's still loading (or mid-transition) never flashes the
              // navigator's default WHITE — it shows the dark/dawn bg + skeleton
              // instead. Applies to every screen in the root stack.
              contentStyle: { backgroundColor: palette.bg },
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
          {/* Admin "act as" indicator — global, top of everything when active. */}
          <ActingBanner />
          {/* Branded cold-start intro, then (first launch only) the language
              gate on top of it — both above the app, gate wins z-order. */}
          <MobileIntro />
          <LanguageGate />
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
