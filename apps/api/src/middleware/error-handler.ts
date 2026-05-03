import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { contextFromRequest, writeError } from "../utils/error-sink.js";
import { AppError } from "../utils/errors.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Zod validation errors → 400, persisted at warn level (client-side bug).
  if (err instanceof ZodError) {
    void writeError({
      level: "warn",
      source: "api",
      message: `Validation error: ${err.errors.map((e) => `${e.path.join(".")} — ${e.message}`).join("; ")}`,
      stack: err.stack ?? null,
      statusCode: 400,
      ...contextFromRequest(req),
      metadata: { issues: err.errors },
    });
    res.status(400).json({
      message: "Validation error",
      code: "VALIDATION_ERROR",
      statusCode: 400,
      errors: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // Known application errors → expected statuses; persist 5xx at error level,
  // 4xx at warn (operational signal but not necessarily a bug).
  if (err instanceof AppError) {
    void writeError({
      level: err.statusCode >= 500 ? "error" : "warn",
      source: "api",
      message: err.message,
      stack: err.stack ?? null,
      statusCode: err.statusCode,
      ...contextFromRequest(req),
      metadata: { code: err.code },
    });
    res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
    });
    return;
  }

  // Unknown / uncaught errors → 500 + persisted at error level with full stack.
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
