import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { getIO } from "../../utils/io-registry.js";

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

  res.status(201).json({ data: created });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  await assertParticipant(req.params.conversationId, req.user!.userId);
  await prisma.message.updateMany({
    where: { conversationId: req.params.conversationId, recipientId: req.user!.userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ success: true });
}
