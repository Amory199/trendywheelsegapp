import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initAppCheck } from "../lib/app-check";
import { useAuth } from "../lib/auth-store";
import { installMobileErrorReporter } from "../lib/error-reporter";
import { routeNotification } from "../lib/notification-router";
import { registerPushToken } from "../lib/push";

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
  useEffect(() => {
    if (user?.id) void registerPushToken();
  }, [user?.id]);

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
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
