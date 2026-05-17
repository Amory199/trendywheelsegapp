import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

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
  useEffect(() => {
    if (user?.id) void registerPushToken();
  }, [user?.id]);

  return (
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
  );
}
