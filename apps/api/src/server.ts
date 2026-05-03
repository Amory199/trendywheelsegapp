import "express-async-errors";

import { createServer } from "http";

import { Server as SocketServer } from "socket.io";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { registerSocketNamespaces } from "./sockets/index.js";
import { writeError } from "./utils/error-sink.js";
import { registerIO } from "./utils/io-registry.js";
import { logger } from "./utils/logger.js";
import { ensureBucket } from "./utils/storage.js";

// ─── Process-level safety net ───────────────────────────────────
// Anything that escapes both Express and the worker handlers lands here.
// We log + persist, then keep running (PM2 will restart on fatal anyway).
process.on("uncaughtException", (err) => {
  void writeError({
    level: "fatal",
    source: "process",
    message: `uncaughtException: ${err.message}`,
    stack: err.stack ?? null,
  });
});

process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
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
  try {
    await ensureBucket();
  } catch (err) {
    logger.warn({ err }, "MinIO bucket check failed (non-fatal)");
  }
});

export { io };
