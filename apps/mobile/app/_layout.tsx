import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAuth } from "../lib/auth-store";
import { installMobileErrorReporter } from "../lib/error-reporter";
import { registerPushToken } from "../lib/push";

// Wrap in try/catch — nothing at module-load should ever block first paint.
try {
  installMobileErrorReporter();
} catch {
  // never let error reporting break boot
}

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

  // Tap on a CRM push (lead_assigned / lead_reassigned) jumps the user to the
  // affected lead detail. Notifications without a leadId in their data payload
  // are silently dropped — the foreground banner already shows the title/body.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as {
        type?: string;
        leadId?: string;
      } | null;
      if (!data?.leadId) return;
      if (
        data.type === "lead_assigned" ||
        data.type === "lead_reassigned" ||
        data.type === "lead_escalation"
      ) {
        router.push(`/crm/leads/${data.leadId}`);
      }
    });
    return () => sub.remove();
  }, [router]);

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
