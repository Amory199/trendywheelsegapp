import "express-async-errors";

import { createServer } from "http";

import { Server as SocketServer } from "socket.io";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { registerSocketNamespaces } from "./sockets/index.js";
import { writeError } from "./utils/error-sink.js";
import { initFirebase } from "./utils/firebase.js";
import { registerIO } from "./utils/io-registry.js";
import { logger } from "./utils/logger.js";
import { initSentry, Sentry } from "./utils/sentry.js";
import { ensureBucket } from "./utils/storage.js";

if (env.NODE_ENV === "production" && env.ENABLE_TRIAL_OTP_BYPASS) {
  // Prod bypass is now scoped to APPLE_REVIEW_BYPASS only (the dev staff codes
  // are NODE_ENV-gated in auth/service.ts). Warn loudly so this stays visible
  // in the audit log and someone removes the flag after App Store approval.
  // eslint-disable-next-line no-console
  console.warn(
    "[startup] ENABLE_TRIAL_OTP_BYPASS=true in production. " +
      "Only APPLE_REVIEW_BYPASS entries are active (see auth/service.ts). " +
      "Remove this flag once the App Store submission is approved.",
  );
}

initSentry();
initFirebase();

// ─── Process-level safety net ───────────────────────────────────
// Anything that escapes both Express and the worker handlers lands here.
// We log + persist, then keep running (PM2 will restart on fatal anyway).
process.on("uncaughtException", (err) => {
  Sentry.captureException(err);
  void writeError({
    level: "fatal",
    source: "process",
    message: `uncaughtException: ${err.message}`,
    stack: err.stack ?? null,
  });
});

process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  Sentry.captureException(err);
  void writeError({
    level: "fatal",
    source: "process",
    message: `unhandledRejection: ${err.message}`,
    stack: err.stack ?? null,
  });
});

const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()),
    credentials: true,
  },
});

io.engine.on(
  "connection_error",
  (err: { req?: { url?: string }; code?: number; message?: string; context?: unknown }) => {
    // Engine.IO codes 1 (Session ID unknown) and 3 (TRANSPORT_HANDSHAKE_ERROR)
    // are routine client-side noise — stale sessions retrying after a server
    // restart, Nginx not forwarding WS upgrade headers, etc. They are NOT
    // actionable bugs and were spamming Sentry to "escalated/high" priority.
    // Log them locally but don't ship to the error sink.
    if (err.code === 1 || err.code === 3) {
      logger.debug(
        { code: err.code, ctx: err.context, url: err.req?.url },
        "engine.io connection_error (noise; not reported)",
      );
      return;
    }
    void writeError({
      level: "warn",
      source: "socket",
      message: `Socket connection_error: ${err.message ?? "unknown"}`,
      metadata: { code: err.code, context: err.context, url: err.req?.url },
    });
  },
);

registerIO(io);
registerSocketNamespaces(io);

httpServer.listen(env.PORT, async () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "TrendyWheels API server started");
  if (env.STAFF_TEST_PHONES) {
    logger.warn(
      { phones: env.STAFF_TEST_PHONES },
      "STAFF_TEST_PHONES is set — staff phones can authenticate via Firebase Phone Auth. Dev/test only.",
    );
  }
  try {
    await ensureBucket();
  } catch (err) {
    logger.warn({ err }, "MinIO bucket check failed (non-fatal)");
  }
});

// ─── Graceful shutdown ──────────────────────────────────────────
// On a PM2 restart/reload (SIGINT/SIGTERM) stop accepting new connections and
// let in-flight requests finish before exiting, so a deploy during campaign
// traffic doesn't throw brief 5xx / dropped connections at customers. A
// timeout force-exits so a stuck socket can never block the restart forever.
let shuttingDown = false;
function gracefulShutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Graceful shutdown — draining connections");
  const forceExit = setTimeout(() => {
    logger.warn("Drain timed out after 10s; forcing exit");
    process.exit(0);
  }, 10_000);
  forceExit.unref();
  io.close();
  httpServer.close(() => {
    clearTimeout(forceExit);
    logger.info("Drain complete; exiting cleanly");
    process.exit(0);
  });
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { io };
