import { api } from "./api";

const SOURCE = "mobile" as const;

interface ReportPayload {
  level: "error" | "warn" | "fatal";
  message: string;
  stack?: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

const baseUrl = (api as unknown as { baseUrl: string }).baseUrl;

export function reportClientError(payload: ReportPayload): void {
  const body = JSON.stringify({ ...payload, source: SOURCE });
  fetch(`${baseUrl}/api/client-errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {
    // never let reporting throw
  });
}

let installed = false;

/**
 * Install React Native global handlers exactly once at app startup so every
 * uncaught JS error and unhandled promise rejection is forwarded to the API.
 * Safe to call from any module — guarded so re-renders cannot double-install.
 */
export function installMobileErrorReporter(): void {
  if (installed) return;
  installed = true;

  const ErrorUtils = (
    global as unknown as {
      ErrorUtils?: {
        setGlobalHandler: (fn: (err: Error, isFatal?: boolean) => void) => void;
        getGlobalHandler: () => (err: Error, isFatal?: boolean) => void;
      };
    }
  ).ErrorUtils;
  if (ErrorUtils?.setGlobalHandler) {
    const previous = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((err: Error, isFatal?: boolean) => {
      try {
        reportClientError({
          level: isFatal ? "fatal" : "error",
          message: err?.message ?? "Unknown JS error",
          stack: err?.stack,
        });
      } finally {
        previous(err, isFatal);
      }
    });
  }

  // Unhandled promise rejections
  const g = global as unknown as {
    addEventListener?: (e: string, fn: (ev: unknown) => void) => void;
  };
  if (typeof g.addEventListener === "function") {
    g.addEventListener("unhandledrejection", (event: unknown) => {
      const reason = (event as { reason?: unknown })?.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      reportClientError({ level: "error", message: `unhandledRejection: ${message}`, stack });
    });
  }
}
