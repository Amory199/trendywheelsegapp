import { createServer } from "http";

import { Server as SocketServer } from "socket.io";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const httpServer = createServer(app);

// Socket.io setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()),
    credentials: true,
  },
});

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Socket connected");
  socket.on("disconnect", () => {
    logger.debug({ socketId: socket.id }, "Socket disconnected");
  });
});

// Start server
httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "TrendyWheels API server started");
});

export { io };
