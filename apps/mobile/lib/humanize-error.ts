import { ApiClientError } from "@trendywheels/api-client";
import { t, type Locale } from "@trendywheels/i18n";

import { useLocale } from "./locale";

// Turn any thrown value into a customer-safe message. We NEVER want raw
// backend text ("Internal Server Error", a Prisma/DB string) or a bare fetch
// error reaching a customer — for network/timeout/5xx we substitute the
// friendly localized line. Clean 4xx validation messages (the API's
// humanized Zod output) are trusted and passed through so the user still
// learns *what* to fix.
export function humanizeError(err: unknown, locale: Locale): string {
  const friendly = t("common.errorBody", locale);

  if (err instanceof ApiClientError) {
    // Network down / request timed out → always the friendly line.
    if (err.statusCode === 0 || err.code === "TIMEOUT") return friendly;
    // Server-side failure → hide the raw message.
    if (err.statusCode >= 500) return friendly;
    // Session problems get their own copy elsewhere; fall back to friendly.
    if (err.code === "SESSION_EXPIRED" || err.code === "REFRESH_FAILED") return friendly;
    // 4xx with a real, already-humanized message (validation, conflicts) →
    // trust it so the user knows what to correct.
    if (err.message && err.message.trim().length > 0) return err.message;
    return friendly;
  }

  // Unknown throwable (raw Error, string, etc.) — never surface it verbatim.
  return friendly;
}

// Hook form for components/screens that already have the locale in context.
export function useHumanizeError(): (err: unknown) => string {
  const locale = useLocale((s) => s.locale);
  return (err: unknown) => humanizeError(err, locale);
}
