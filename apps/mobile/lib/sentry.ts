import * as Sentry from "@sentry/react-native";

// Sentry init is intentionally a no-op right now: on RN 0.79 + SDK 53 the
// native bridge init hangs the JS thread before first paint (splash forever).
// JS error reports still flow to the API via lib/error-reporter.ts.
// Re-enable once we've verified @sentry/react-native works with new arch.

let initialized = false;

export function initMobileSentry(): void {
  if (initialized) return;
  initialized = true;
  // Intentionally do nothing for now. See note above.
}

export function reportError(err: unknown): void {
  // No-op while Sentry init is disabled. error-reporter.ts still POSTs to
  // /api/client-errors so we don't lose error visibility.
  if (err && false) Sentry.captureException(err as Error);
}

export { Sentry };
