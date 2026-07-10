import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { getIO } from "../../utils/io-registry.js";
import { notifyAdmins, notifyUser } from "../../utils/notify.js";

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

// A customer's support thread is shared by the whole team: it holds the customer
// plus every active staff/admin as participants, so anyone can see and answer it
// — and replies thread into the same conversation instead of spawning a new 1:1.
// Staff/admin ⇄ customer is the only "support" shape; customer⇄customer and
// staff⇄staff stay ordinary 1:1 threads.
const STAFF_ACCOUNT_TYPES = ["admin", "staff"];

async function findOrCreateSupportConversation(
  customerId: string,
  staffId: string,
): Promise<string> {
  const existing = await prisma.conversation.findFirst({
    where: {
      participants: { some: { userId: customerId } },
      AND: [{ participants: { some: { user: { accountType: { in: ["admin", "staff"] } } } } }],
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing.id;
  const conv = await prisma.conversation.create({
    data: { participants: { create: [{ userId: customerId }, { userId: staffId }] } },
  });
  return conv.id;
}

// Add every active staff/admin as a participant so the support thread shows up
// in each of their inboxes and passes the participant check. Idempotent.
async function ensureAllStaffParticipants(conversationId: string): Promise<void> {
  const [staff, existing] = await Promise.all([
    prisma.user.findMany({
      where: { accountType: { in: ["admin", "staff"] }, status: "active" },
      select: { id: true },
    }),
    prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    }),
  ]);
  const have = new Set(existing.map((p) => p.userId));
  const toAdd = staff.filter((s) => !have.has(s.id)).map((s) => ({ conversationId, userId: s.id }));
  if (toAdd.length > 0) {
    await prisma.conversationParticipant.createMany({ data: toAdd, skipDuplicates: true });
  }
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
  const { recipientId, message, attachments, conversationId: requestedConversationId } = req.body;
  const senderId = req.user!.userId;

  if (recipientId === senderId) throw AppError.badRequest("Cannot message yourself");

  // Context threads must receive their messages directly — routing by
  // recipient would silently divert replies into the generic support thread.
  if (requestedConversationId) {
    await assertParticipant(requestedConversationId, senderId);
  }

  // Detect a support thread: exactly one side is staff/admin (the other a
  // customer). Those become shared, team-wide threads with a broadcast ping so
  // any staff member can pick it up — not a private DM to one person.
  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, select: { name: true, accountType: true } }),
    prisma.user.findUnique({ where: { id: recipientId }, select: { accountType: true } }),
  ]);
  const senderIsStaff = !!sender && STAFF_ACCOUNT_TYPES.includes(sender.accountType);
  const recipientIsStaff = !!recipient && STAFF_ACCOUNT_TYPES.includes(recipient.accountType);
  const isSupport = senderIsStaff !== recipientIsStaff;

  let conversationId: string;
  if (requestedConversationId) {
    conversationId = requestedConversationId;
  } else if (isSupport) {
    const customerId = senderIsStaff ? recipientId : senderId;
    const staffId = senderIsStaff ? senderId : recipientId;
    conversationId = await findOrCreateSupportConversation(customerId, staffId);
    await ensureAllStaffParticipants(conversationId);
  } else {
    conversationId = await findOrCreateConversation(senderId, recipientId);
  }

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

  const preview = typeof message === "string" ? message.slice(0, 140) : "New message";
  if (isSupport && !senderIsStaff) {
    // Customer → support: ping every active staff/admin so anyone can respond.
    await notifyAdmins(`support-msg-${created.id}`, {
      type: "message_new",
      title: `Support · ${sender?.name || "Customer"}`,
      body: preview,
      data: { conversationId, messageId: created.id, url: `/messages/${conversationId}` },
    });
  } else {
    // Staff reply to a customer, or an ordinary 1:1 DM: notify the recipient.
    await notifyUser(recipientId, `message-${created.id}`, {
      type: "message_new",
      title: sender?.name || "New message",
      body: preview,
      data: { conversationId, messageId: created.id, url: `/messages/${conversationId}` },
    });
  }

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

// ─── Context threads (a chat ABOUT a booking/reservation/repair) ──────
// One shared customer+staff thread per transaction, with a pinned label.

const CONTEXT_OWNER_LOOKUP: Record<string, (id: string) => Promise<{ userId: string } | null>> = {
  booking: (id) => prisma.booking.findUnique({ where: { id }, select: { userId: true } }),
  reservation: (id) => prisma.reservation.findUnique({ where: { id }, select: { userId: true } }),
  repair: (id) => prisma.repairRequest.findUnique({ where: { id }, select: { userId: true } }),
  order: (id) => prisma.order.findUnique({ where: { id }, select: { userId: true } }),
  listing: (id) => prisma.salesListing.findUnique({ where: { id }, select: { userId: true } }),
};

export async function openContextThread(req: Request, res: Response): Promise<void> {
  const { contextType, contextId, contextTitle } = req.body as {
    contextType: string;
    contextId: string;
    contextTitle?: string;
  };
  const caller = req.user!;

  const lookup = CONTEXT_OWNER_LOOKUP[contextType];
  if (!lookup) throw AppError.badRequest("Unknown context type");
  const record = await lookup(contextId);
  if (!record) throw AppError.notFound("Context record not found");

  // Access: the transaction's owner, or staff/admin. Nobody else can open
  // (or discover) a thread about someone else's booking.
  const callerIsStaff = STAFF_ACCOUNT_TYPES.includes(caller.accountType);
  if (!callerIsStaff && record.userId !== caller.userId) {
    throw AppError.forbidden("Not your transaction");
  }
  const customerId = record.userId;

  const existing = await prisma.conversation.findFirst({
    where: { contextType, contextId },
  });
  if (existing) {
    // Staff coverage may have changed since creation; keep the team looped in.
    await ensureAllStaffParticipants(existing.id);
    res.json({ data: existing });
    return;
  }

  const staff = await prisma.user.findFirst({
    where: { accountType: { in: ["admin", "staff"] }, status: "active" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const participantIds = [...new Set([customerId, caller.userId, staff?.id].filter(Boolean))];
  const conv = await prisma.conversation.create({
    data: {
      contextType,
      contextId,
      contextTitle: (contextTitle ?? "").slice(0, 120) || null,
      participants: { create: participantIds.map((userId) => ({ userId: userId! })) },
    },
  });
  await ensureAllStaffParticipants(conv.id);
  res.status(201).json({ data: conv });
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  await assertParticipant(req.params.conversationId, req.user!.userId);
  const conv = await prisma.conversation.findUnique({
    where: { id: req.params.conversationId },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, accountType: true } } },
      },
    },
  });
  if (!conv) throw AppError.notFound("Conversation not found");
  res.json({ data: conv });
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
