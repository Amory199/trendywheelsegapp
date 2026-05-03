"use client";

import { useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const SOURCE = "customer" as const;

interface ReportPayload {
  level: "error" | "warn" | "fatal";
  message: string;
  stack?: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

export function reportClientError(payload: ReportPayload): void {
  // Fire-and-forget. Use sendBeacon when available so reports survive page unload.
  const body = JSON.stringify({ ...payload, source: SOURCE });
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(`${API_BASE}/api/client-errors`, blob);
      return;
    }
  } catch {
    // fall through to fetch
  }
  fetch(`${API_BASE}/api/client-errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // swallow — never let error reporting itself throw
  });
}

/**
 * Mounts global window listeners that pipe every uncaught error and
 * unhandled promise rejection back to the API. Drop into the root layout once.
 */
export function ErrorReporter(): null {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportClientError({
        level: "error",
        message: event.message || "window.onerror",
        stack: event.error?.stack ?? `${event.filename}:${event.lineno}:${event.colno}`,
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
    };

    const onUnhandled = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      reportClientError({
        level: "error",
        message: `unhandledRejection: ${message}`,
        stack,
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  return null;
}
