import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { notifyAdmins, notifyUser } from "../../utils/notify.js";

const STAFF_TYPES = new Set(["admin", "staff"]);

// Sender info attached to every thread message so the UI can right/left-align
// and label "you" vs "support" by role.
const MESSAGE_INCLUDE = {
  messages: {
    include: { sender: { select: { id: true, name: true, accountType: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

// Prisma enum names use snake_case (`in_progress`); the API/UI uses kebab-case (`in-progress`).
// Translate at the boundary so callers don't need to know the storage detail.
type ApiStatus = "open" | "in-progress" | "resolved" | "closed";
type DbStatus = "open" | "in_progress" | "resolved" | "closed";

function toDbStatus(s: ApiStatus | DbStatus | undefined): DbStatus | undefined {
  if (!s) return undefined;
  return s === "in-progress" ? "in_progress" : (s as DbStatus);
}

function fromDbStatus<T extends { status: DbStatus }>(t: T): T & { status: ApiStatus } {
  return { ...t, status: t.status === "in_progress" ? "in-progress" : t.status } as T & {
    status: ApiStatus;
  };
}

function fromDbStatusList<T extends { status: DbStatus }>(
  rows: T[],
): Array<T & { status: ApiStatus }> {
  return rows.map(fromDbStatus);
}

export async function list(req: Request, res: Response): Promise<void> {
  const {
    status,
    priority,
    userId,
    assignedAgentId,
    page = 1,
    limit = 20,
  } = req.query as Record<string, string>;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const where: Record<string, unknown> = {};
  if (status) where.status = toDbStatus(status as ApiStatus);
  if (priority) where.priority = priority;

  if (!STAFF_TYPES.has(req.user!.accountType)) {
    where.userId = req.user!.userId;
  } else {
    if (userId) where.userId = userId;
    if (assignedAgentId) where.assignedAgentId = assignedAgentId;
  }

  const [data, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        user: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  res.json({ data: fromDbStatusList(data), total, page: pageNum, limit: limitNum });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      agent: { select: { id: true, name: true } },
      ...MESSAGE_INCLUDE,
    },
  });
  if (!ticket) throw AppError.notFound("Ticket not found");
  if (!STAFF_TYPES.has(req.user!.accountType) && ticket.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }
  res.json({ data: fromDbStatus(ticket) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { subject, message, priority } = req.body as {
    subject: string;
    message: string;
    priority?: "low" | "medium" | "high" | "urgent";
  };
  const userId = req.user!.userId;

  // A ticket is born WITH its opening message as the first thread entry — so a
  // brand-new request starts a fresh, empty-of-history thread (the whole point
  // of moving off the reused-conversation model).
  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      subject,
      priority: priority ?? "medium",
      status: "open",
      messages: { create: { senderId: userId, body: message } },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      agent: { select: { id: true, name: true } },
      ...MESSAGE_INCLUDE,
    },
  });

  await notifyAdmins(`ticket-created-${ticket.id}`, {
    type: "support_ticket",
    title: "New support ticket",
    body: subject,
    data: { ticketId: ticket.id, url: `/support/tickets/${ticket.id}` },
  });

  res.status(201).json({ data: fromDbStatus(ticket), id: ticket.id });
}

// Append a message to a ticket's own thread. Owner or any staff may post.
export async function postMessage(req: Request, res: Response): Promise<void> {
  const { message } = req.body as { message: string };
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) throw AppError.notFound("Ticket not found");

  const isStaff = STAFF_TYPES.has(req.user!.accountType);
  if (!isStaff && ticket.userId !== req.user!.userId) throw AppError.forbidden();

  const created = await prisma.ticketMessage.create({
    data: { ticketId: ticket.id, senderId: req.user!.userId, body: message },
    include: { sender: { select: { id: true, name: true, accountType: true } } },
  });

  // A staff reply moves an open ticket into progress; otherwise just bump it to
  // the top of the queue by touching updatedAt.
  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data:
      isStaff && ticket.status === "open" ? { status: "in_progress" } : { updatedAt: new Date() },
  });

  // Notify the other side — the customer when staff replies, the team when the
  // customer does. This is the "every client request reaches the team" path.
  if (isStaff) {
    await notifyUser(ticket.userId, `ticket-reply-${created.id}`, {
      type: "support_reply",
      title: "Support replied to your ticket",
      body: message.slice(0, 120),
      data: { ticketId: ticket.id, url: `/support/tickets/${ticket.id}` },
    });
  } else {
    await notifyAdmins(`ticket-reply-${created.id}`, {
      type: "support_ticket",
      title: "New reply on a support ticket",
      body: message.slice(0, 120),
      data: { ticketId: ticket.id, url: `/support/tickets/${ticket.id}` },
    });
  }

  res.status(201).json({ data: created });
}

export async function update(req: Request, res: Response): Promise<void> {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) throw AppError.notFound("Ticket not found");

  if (!STAFF_TYPES.has(req.user!.accountType)) {
    throw AppError.forbidden("Only staff can update tickets");
  }

  const body = req.body as { status?: ApiStatus; priority?: string; assignedAgentId?: string };
  const data: Record<string, unknown> = {};
  if (body.status) data.status = toDbStatus(body.status);
  if (body.priority) data.priority = body.priority;
  if (body.assignedAgentId) data.assignedAgentId = body.assignedAgentId;

  const updated = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data,
    include: {
      user: { select: { id: true, name: true, email: true } },
      agent: { select: { id: true, name: true } },
    },
  });
  res.json({ data: fromDbStatus(updated) });
}
