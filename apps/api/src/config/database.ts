import { PrismaClient } from "@trendywheels/db";

import { logger } from "../utils/logger.js";

export const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" },
  ],
});

const SLOW_QUERY_MS = 500;

prisma.$on("error" as never, (e: { message?: string; target?: string }) => {
  // Persist via dynamic import to avoid circular dep with utils/error-sink.
  void import("../utils/error-sink.js").then(({ writeError }) =>
    writeError({
      level: "error",
      source: "api",
      message: `Prisma error: ${e.message ?? "unknown"}`,
      metadata: { target: e.target ?? null },
    }),
  );
  logger.error(e, "Prisma error");
});

prisma.$on("warn" as never, (e: { message?: string }) => {
  logger.warn(e, "Prisma warning");
});

prisma.$on("query" as never, (e: { duration?: number; query?: string }) => {
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
