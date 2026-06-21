import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { contextFromRequest, writeError } from "../utils/error-sink.js";
import { AppError } from "../utils/errors.js";
import { Sentry } from "../utils/sentry.js";
import { humanizeZodError } from "../utils/zod-error.js";

// Smoke-test runs deliberately exercise 4xx paths (e.g. forbidden-on-non-
// deletable-status). Those flow through this handler and would otherwise
// pollute Sentry / writeError every run. Skip persistence when the request
// is from the checked-in smoke script.
function isSmokeTest(req: { headers?: Record<string, unknown> }): boolean {
  const ua = req.headers?.["user-agent"];
  return typeof ua === "string" && ua.startsWith("tw-smoke-test");
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const smoke = isSmokeTest(req);

  // Zod validation errors → 400. Do NOT persist to the errorLog table —
  // these are pure client-side bugs (stale mobile build, cached browser,
  // hand-crafted request) and the API already returned a clear 400 to the
  // caller with the offending field + message. The HTTP access log + the
  // 400 response itself carry everything needed to debug. Writing them to
  // `/logs` floods the admin page with yellow noise that drowns out real
  // server errors. Sentry similarly gets skipped because client validation
  // is not a server fault.
  if (err instanceof ZodError) {
    // Friendly, field-named messages so the client can show the user exactly
    // what to fix instead of a bare "Validation error". `message` is a one-line
    // summary (toast/banner); `errors[]` carries per-field detail for inline
    // form errors.
    const { summary, fields } = humanizeZodError(err);
    res.status(400).json({
      message: summary,
      code: "VALIDATION_ERROR",
      statusCode: 400,
      errors: fields,
    });
    return;
  }

  // Known application errors → persist 5xx at error, 4xx at warn. Skip:
  //  - anonymous 401/404 hits → scanner / probe traffic
  //  - any 404 → routine "record not found / scope changed" (e.g. sales
  //    GETting a rotated lead returns 404 "no longer in your pipeline",
  //    which is the new owner's expected behaviour — not an error worth
  //    surfacing in the admin log every time the smoke test runs).
  // Keep 403 (real access-violation signal) and 400 (validation bugs).
  if (err instanceof AppError) {
    const isAnonProbe = !req.user && (err.statusCode === 401 || err.statusCode === 404);
    const isRoutine404 = err.statusCode === 404;
    if (!isAnonProbe && !isRoutine404 && !smoke) {
      void writeError({
        level: err.statusCode >= 500 ? "error" : "warn",
        source: "api",
        message: err.message,
        stack: err.stack ?? null,
        statusCode: err.statusCode,
        ...contextFromRequest(req),
        metadata: { code: err.code },
      });
    }
    res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
    });
    return;
  }

  // Unknown / uncaught errors → 500 + persisted at error level with full stack.
  if (err instanceof Error) Sentry.captureException(err);
  void writeError({
    level: "error",
    source: "api",
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? (err.stack ?? null) : null,
    statusCode: 500,
    ...contextFromRequest(req),
  });
  res.status(500).json({
    message: "Internal server error",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  });
};
