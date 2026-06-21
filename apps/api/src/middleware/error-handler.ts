import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { contextFromRequest, writeError } from "../utils/error-sink.js";
import { AppError } from "../utils/errors.js";
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

  // RECORD-EVERYTHING (owner directive 2026-06-21): nothing should go unnoticed.
  // Every error — including client validation 400s — is sent to Sentry + the
  // admin error log. The ONLY exception is our own smoke-test traffic, which
  // deliberately exercises 4xx on every deploy; capturing it would bury the real
  // errors (INC-007). Severity LEVEL is graded (5xx=error, 4xx=warn, validation
  // 400=warn) so the dashboard stays triageable even at higher volume.
  if (err instanceof ZodError) {
    // Friendly, field-named messages so the client can show the user exactly
    // what to fix. `message` is a one-line summary; `errors[]` carries per-field
    // detail for inline form errors.
    const { summary, fields } = humanizeZodError(err);
    if (!smoke) {
      void writeError({
        level: "warn",
        source: "api",
        message: `Validation error: ${summary}`,
        statusCode: 400,
        ...contextFromRequest(req),
        metadata: { code: "VALIDATION_ERROR", fields },
      });
    }
    res.status(400).json({
      message: summary,
      code: "VALIDATION_ERROR",
      statusCode: 400,
      errors: fields,
    });
    return;
  }

  if (err instanceof AppError) {
    if (!smoke) {
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
  // writeError() forwards to Sentry itself, so no separate captureException here
  // (that double-reported every 500).
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
