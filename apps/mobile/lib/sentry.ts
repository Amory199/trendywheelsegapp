import * as Sentry from "@sentry/react-native";

let initialized = false;

export function initMobileSentry(): void {
  if (initialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_ENV ?? "production",
    tracesSampleRate: 0.1,
    enableNative: true,
  });
  initialized = true;
}

export function reportError(err: unknown): void {
  if (process.env.EXPO_PUBLIC_SENTRY_DSN && err instanceof Error) {
    Sentry.captureException(err);
  }
}

export { Sentry };
