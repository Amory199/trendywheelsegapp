import type { Request } from "express";

import { logger } from "./logger.js";
import { Sentry } from "./sentry.js";

export type ErrorSource =
  | "api"
  | "worker"
  | "socket"
  | "process"
  | "admin"
  | "support"
  | "inventory"
  | "customer"
  | "mobile";

export type ErrorLevel = "error" | "warn" | "fatal";

interface ErrorContext {
  level?: ErrorLevel;
  source: ErrorSource;
  message: string;
  stack?: string | null;
  route?: string | null;
  method?: string | null;
  statusCode?: number | null;
  userId?: string | null;
  requestId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Persist any error / warn / fatal event to the ErrorLog table AND emit to
 * the structured logger. Never throws — error reporting must never crash the
 * caller. Failures fall back to logger.error so we still see the original on
 * stdout / PM2 logs.
 */
export async function writeError(ctx: ErrorContext): Promise<void> {
  const level: ErrorLevel = ctx.level ?? "error";

  // Always emit on the local logger so PM2 / docker logs catch it even if the
  // DB is unreachable.
  const logFn = level === "warn" ? logger.warn : level === "fatal" ? logger.fatal : logger.error;
  logFn.call(
    logger,
    {
      source: ctx.source,
      route: ctx.route,
      method: ctx.method,
      statusCode: ctx.statusCode,
      userId: ctx.userId,
      requestId: ctx.requestId,
      stack: ctx.stack,
      metadata: ctx.metadata,
    },
    ctx.message,
  );

  // Expected auth rejections (401 unauthenticated / 403 forbidden) are the auth
  // layer doing its job — invalid/expired tokens, guest hits on protected routes,
  // failed logins, permission denials. They are never server bugs, and at volume
  // they bury the real errors in Sentry. Keep them OUT of Sentry, but still
  // persist them to the ErrorLog table + local logger below (RECORD-EVERYTHING,
  // owner directive 2026-06-21 — nothing goes unnoticed, it's just not paged).
  // Validation 400s and every 5xx still reach Sentry.
  const isExpectedAuthNoise =
    level === "warn" && (ctx.statusCode === 401 || ctx.statusCode === 403);

  if (!isExpectedAuthNoise) {
    try {
      Sentry.withScope((scope) => {
        scope.setLevel(level === "fatal" ? "fatal" : level === "warn" ? "warning" : "error");
        scope.setTag("source", ctx.source);
        scope.setTag(
          "origin",
          ctx.source === "mobile" ||
            ["admin", "support", "inventory", "customer"].includes(ctx.source)
            ? "client-forwarded"
            : "server",
        );
        if (ctx.route) scope.setTag("route", ctx.route);
        if (ctx.method) scope.setTag("method", ctx.method);
        if (ctx.userId) scope.setUser({ id: ctx.userId });
        if (ctx.metadata) scope.setExtras(ctx.metadata);
        if (ctx.stack) {
          const err = new Error(ctx.message);
          err.stack = ctx.stack;
          Sentry.captureException(err);
        } else {
          Sentry.captureMessage(ctx.message);
        }
      });
    } catch {
      /* never let Sentry breakage prevent local logging */
    }
  }

  try {
    // Lazy import breaks the database.ts ⇄ error-sink.ts module cycle: database
    // already loads us dynamically (slow-query hook), so importing prisma at
    // top-level here closed the loop and blocked tree-shaking. By the time any
    // error is written, database.ts is fully initialised.
    const { prisma } = await import("../config/database.js");
    await prisma.errorLog.create({
      data: {
        level,
        source: ctx.source,
        message: truncate(ctx.message, 4_000),
        stack: ctx.stack ? truncate(ctx.stack, 16_000) : null,
        route: ctx.route ?? null,
        method: ctx.method ?? null,
        statusCode: ctx.statusCode ?? null,
        userId: ctx.userId ?? null,
        requestId: ctx.requestId ?? null,
        userAgent: ctx.userAgent ? truncate(ctx.userAgent, 500) : null,
        ipAddress: ctx.ipAddress ?? null,
        metadata: (ctx.metadata ?? null) as never,
      },
    });
  } catch (dbErr) {
    // Last-ditch: do NOT recurse into writeError — just log to stdout.
    logger.error({ err: dbErr, originalMessage: ctx.message }, "ErrorLog write failed");
  }
}

/**
 * Pull request-scoped fields onto the error context. Safe to call with no
 * request (e.g. from worker / process handlers).
 */
export function contextFromRequest(req: Request | undefined): Partial<ErrorContext> {
  if (!req) return {};
  const headers = req.headers ?? {};
  const ipFromHeader = (headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  return {
    route: req.originalUrl ?? req.url,
    method: req.method,
    requestId: (headers["x-request-id"] as string | undefined) ?? null,
    userAgent: (headers["user-agent"] as string | undefined) ?? null,
    ipAddress: ipFromHeader || req.ip || null,
    userId: req.user?.userId ?? null,
  };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}
