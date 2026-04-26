import "express-async-errors";

import { createServer } from "http";

import { Server as SocketServer } from "socket.io";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { registerSocketNamespaces } from "./sockets/index.js";
import { registerIO } from "./utils/io-registry.js";
import { logger } from "./utils/logger.js";
import { ensureBucket } from "./utils/storage.js";

const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()),
    credentials: true,
  },
});

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
