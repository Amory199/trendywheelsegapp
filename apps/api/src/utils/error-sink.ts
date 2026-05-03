import type { Request } from "express";

import { prisma } from "../config/database.js";

import { logger } from "./logger.js";

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

  try {
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
