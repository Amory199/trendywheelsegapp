import * as Sentry from "@sentry/react-native";

// Crash reporting. History: on RN 0.79 + SDK 53 the native bridge init hung
// the JS thread before first paint (splash forever), so this was a no-op.
// We're on RN 0.81 + SDK 54 + sentry-rn 7.x now, and init is DEFERRED — the
// root layout calls initMobileSentry() ~1.5s after mount, so even a
// worst-case native hang can never block boot or first paint again.
// JS errors also still flow to /api/client-errors via lib/error-reporter.ts.
//
// DSN is the shared TrendyWheels Sentry project. Native crashes are tagged
// platform:mobile so they're filterable next to API events.

let initialized = false;

export function initMobileSentry(): void {
  if (initialized) return;
  initialized = true;
  try {
    Sentry.init({
      // Dedicated mobile Sentry project (same DSN as eas.json build env).
      dsn:
        process.env.EXPO_PUBLIC_SENTRY_DSN ??
        "https://93ce0c39e197aeac754e220bd597fc67@o4511359676252160.ingest.de.sentry.io/4511359744344144",
      enabled: !__DEV__,
      tracesSampleRate: 0.1,
      initialScope: { tags: { platform: "mobile" } },
    });
  } catch {
    // Never let crash reporting crash the app.
  }
}

export function reportError(err: unknown): void {
  if (!initialized) return;
  try {
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
  } catch {
    /* swallow — reporting must never throw */
  }
}

export { Sentry };
