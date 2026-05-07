"use client";

import * as Sentry from "@sentry/nextjs";

let initialized = false;

export function initBrowserSentry(): void {
  if (initialized) return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });
  initialized = true;
}

export function reportError(err: unknown): void {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN && err instanceof Error) {
    Sentry.captureException(err);
  }
}
