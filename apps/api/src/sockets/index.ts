import jwt from "jsonwebtoken";
import type { Server as SocketServer, Socket } from "socket.io";

import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import type { AuthPayload } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

interface AuthedSocket extends Socket {
  data: { user: AuthPayload };
}

function authMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token = (socket.handshake.auth?.token as string | undefined) ?? "";
  if (!token) return next(new Error("Missing auth token"));
  try {
    const payload = jwt.verify(token, env.JWT_PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as AuthPayload;
    (socket as AuthedSocket).data.user = payload;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
}

export function registerSocketNamespaces(io: SocketServer): void {
  // ─── /messages namespace ─────────────────────────────────
  const messages = io.of("/messages");
  messages.use(authMiddleware);

  messages.on("connection", (socket) => {
    const user = (socket as AuthedSocket).data.user;
    socket.join(`user:${user.userId}`);
    logger.info({ userId: user.userId, ns: "messages" }, "Socket connected");

    socket.on(
      "message:send",
      async (
        payload: { recipientId: string; message: string; attachments?: string[] },
        ack?: (resp: unknown) => void,
      ) => {
        try {
          const conv = await prisma.conversation.findFirst({
            where: {
              AND: [
                { participants: { some: { userId: user.userId } } },
                { participants: { some: { userId: payload.recipientId } } },
              ],
            },
          });
          const conversationId =
            conv?.id ??
            (
              await prisma.conversation.create({
                data: {
                  participants: {
                    create: [{ userId: user.userId }, { userId: payload.recipientId }],
                  },
                },
              })
            ).id;

          const msg = await prisma.message.create({
            data: {
              senderId: user.userId,
              recipientId: payload.recipientId,
              conversationId,
              message: payload.message,
              attachments: payload.attachments ?? [],
            },
          });
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date() },
          });

          messages.to(`user:${payload.recipientId}`).emit("message:new", msg);
          ack?.({ ok: true, message: msg });
        } catch (err) {
          logger.error(err, "message:send failed");
          ack?.({ ok: false, error: "Failed to send message" });
        }
      },
    );

    socket.on("typing:start", (recipientId: string) => {
      messages.to(`user:${recipientId}`).emit("typing:start", { from: user.userId });
    });

    socket.on("typing:stop", (recipientId: string) => {
      messages.to(`user:${recipientId}`).emit("typing:stop", { from: user.userId });
    });

    socket.on("disconnect", () => {
      logger.debug({ userId: user.userId, ns: "messages" }, "Socket disconnected");
    });
  });

  // ─── /admin namespace (live overview) ────────────────────
  const admin = io.of("/admin");
  admin.use(authMiddleware);
  admin.use((socket, next) => {
    const user = (socket as AuthedSocket).data.user;
    if (user.accountType !== "admin" && user.accountType !== "staff") {
      return next(new Error("Forbidden"));
    }
    next();
  });
  admin.on("connection", (socket) => {
    logger.info({ ns: "admin" }, "Admin socket connected");
    socket.on("disconnect", () => undefined);
  });

  // ─── /notifications namespace ─────────────────────────────
  const notifications = io.of("/notifications");
  notifications.use(authMiddleware);

  notifications.on("connection", (socket) => {
    const user = (socket as AuthedSocket).data.user;
    socket.join(`user:${user.userId}`);
    logger.info({ userId: user.userId, ns: "notifications" }, "Socket connected");

    socket.on("disconnect", () => {
      logger.debug({ userId: user.userId, ns: "notifications" }, "Socket disconnected");
    });
  });

  logger.info("Socket.io namespaces registered: /messages, /admin, /notifications");
}
