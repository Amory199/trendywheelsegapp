import { PrismaClient } from "@trendywheels/db";

import { buildAuditExtension } from "../lib/prisma-audit.js";

// Prisma v5 removed `$on('error')` and `$on('warn')` — only `query` still
// fires as an event. Routing error/warn to stdout lets pino-via-stderr (or
// the PM2 out/err log split) collect them; process-level
// `unhandledRejection` handlers in server.ts + workers/index.ts catch
// anything that escapes a query.
const basePrisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "stdout", level: "error" },
    { emit: "stdout", level: "warn" },
  ],
});

const SLOW_QUERY_MS = 500;

basePrisma.$on("query", (e: { duration?: number; query?: string }) => {
  const ms = e.duration ?? 0;
  if (ms >= SLOW_QUERY_MS) {
    void import("../utils/error-sink.js").then(({ writeError }) =>
      writeError({
        level: "warn",
        source: "api",
        message: `Slow query: ${ms}ms`,
        metadata: { query: (e.query ?? "").slice(0, 1000), durationMs: ms },
      }),
    );
  }
});

// `$extends` returns a typed-but-different client; cast back to PrismaClient
// so existing import sites keep working unchanged. The audit extension only
// intercepts query execution — public surface is identical.
export const prisma = basePrisma.$extends(
  buildAuditExtension(basePrisma),
) as unknown as PrismaClient;
