import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { getIO } from "../../utils/io-registry.js";
import { notifyUser } from "../../utils/notify.js";

async function findOrCreateConversation(userA: string, userB: string): Promise<string> {
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: userA } } },
        { participants: { some: { userId: userB } } },
      ],
    },
  });
  if (existing) return existing.id;

  const conv = await prisma.conversation.create({
    data: {
      participants: { create: [{ userId: userA }, { userId: userB }] },
    },
  });
  return conv.id;
}

export async function listConversations(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });
  res.json({ data: conversations });
}

async function assertParticipant(conversationId: string, userId: string): Promise<void> {
  const membership = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
    select: { id: true },
  });
  if (!membership) throw AppError.forbidden("Not a participant of this conversation");
}

export async function listMessages(req: Request, res: Response): Promise<void> {
  const { conversationId } = req.params;
  await assertParticipant(conversationId, req.user!.userId);
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  res.json({ data: messages });
}

export async function send(req: Request, res: Response): Promise<void> {
  const { recipientId, message, attachments } = req.body;
  const senderId = req.user!.userId;

  if (recipientId === senderId) throw AppError.badRequest("Cannot message yourself");

  const conversationId = await findOrCreateConversation(senderId, recipientId);

  const created = await prisma.message.create({
    data: { senderId, recipientId, conversationId, message, attachments },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Emit real-time event to recipient
  const io = getIO();
  if (io) {
    io.of("/messages").to(`user:${recipientId}`).emit("message:new", created);
  }

  // Queue an in-app + push notification for the recipient.
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { name: true },
  });
  await notifyUser(recipientId, `message-${created.id}`, {
    type: "message_new",
    title: sender?.name || "New message",
    body: typeof message === "string" ? message.slice(0, 140) : "New message",
    data: { conversationId, messageId: created.id, url: `/messages/${conversationId}` },
  });

  res.status(201).json({ data: created });
}

export async function supportContact(_req: Request, res: Response): Promise<void> {
  // Deterministic default support user: first active admin/staff, ordered by
  // creation so the same person is returned every time until they're removed.
  // Customers tap "Message support" and the mobile app uses this id to start
  // or resume a thread.
  const support = await prisma.user.findFirst({
    where: { accountType: { in: ["admin", "staff"] }, status: "active" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, avatarUrl: true },
  });
  if (!support) throw AppError.notFound("No support staff available");
  res.json({ data: support });
}

export async function createConversation(req: Request, res: Response): Promise<void> {
  const { recipientId } = req.body as { recipientId?: string };
  if (!recipientId) throw AppError.badRequest("recipientId required");
  const userId = req.user!.userId;
  if (recipientId === userId) throw AppError.badRequest("Cannot message yourself");
  const conversationId = await findOrCreateConversation(userId, recipientId);
  res.status(201).json({ data: { id: conversationId } });
}

export async function unreadCount(req: Request, res: Response): Promise<void> {
  const count = await prisma.message.count({
    where: { recipientId: req.user!.userId, readAt: null },
  });
  res.json({ count });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  await assertParticipant(req.params.conversationId, req.user!.userId);
  await prisma.message.updateMany({
    where: {
      conversationId: req.params.conversationId,
      recipientId: req.user!.userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  res.json({ success: true });
}
