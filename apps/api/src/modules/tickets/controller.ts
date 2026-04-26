import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

const STAFF_TYPES = new Set(["admin", "staff"]);

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

function fromDbStatusList<T extends { status: DbStatus }>(rows: T[]): Array<T & { status: ApiStatus }> {
  return rows.map(fromDbStatus);
}

export async function list(req: Request, res: Response): Promise<void> {
  const { status, priority, userId, assignedAgentId, page = 1, limit = 20 } = req.query as Record<
    string,
    string
  >;
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
    },
  });
  if (!ticket) throw AppError.notFound("Ticket not found");
  if (!STAFF_TYPES.has(req.user!.accountType) && ticket.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }
  res.json({ data: fromDbStatus(ticket) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { subject, priority } = req.body as {
    subject: string;
    message: string;
    priority?: "low" | "medium" | "high" | "urgent";
  };
  const userId = req.user!.userId;

  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      subject,
      priority: priority ?? "medium",
      status: "open",
    },
  });

  res.status(201).json({ data: fromDbStatus(ticket), id: ticket.id });
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
