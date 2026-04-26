import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { notificationsQueue } from "../../queues/index.js";
import { AppError } from "../../utils/errors.js";

const STAFF_TYPES = new Set(["admin", "staff"]);

// API ↔ DB status translation. Validators use kebab-case ("in-progress"),
// Prisma client uses snake_case ("in_progress"). The DB column @maps to "in-progress".
type ApiStatus = "submitted" | "assigned" | "in-progress" | "completed" | "cancelled";
type DbStatus = "submitted" | "assigned" | "in_progress" | "completed" | "cancelled";

function toDbStatus(s: ApiStatus | DbStatus | undefined): DbStatus | undefined {
  if (!s) return undefined;
  return s === "in-progress" ? "in_progress" : (s as DbStatus);
}

function fromDbStatus<T extends { status: DbStatus }>(t: T): T & { status: ApiStatus } {
  return { ...t, status: t.status === "in_progress" ? "in-progress" : t.status } as T & { status: ApiStatus };
}

export async function list(req: Request, res: Response): Promise<void> {
  const { status, page = 1, limit = 20 } = req.query as Record<string, string>;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const where: Record<string, unknown> = {};
  if (status) where.status = toDbStatus(status as ApiStatus);
  if (req.user!.accountType === "customer") where.userId = req.user!.userId;

  const [data, total] = await Promise.all([
    prisma.repairRequest.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { vehicle: true, mechanic: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.repairRequest.count({ where }),
  ]);

  res.json({ data: data.map(fromDbStatus), total, page: pageNum, limit: limitNum });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const repair = await prisma.repairRequest.findUnique({
    where: { id: req.params.id },
    include: {
      vehicle: true,
      mechanic: { select: { id: true, name: true, email: true } },
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  if (!repair) throw AppError.notFound("Repair request not found");
  if (req.user!.accountType === "customer" && repair.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }
  res.json({ data: fromDbStatus(repair) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const repair = await prisma.repairRequest.create({
    data: {
      ...req.body,
      userId: req.user!.userId,
      status: "submitted",
      preferredDate: req.body.preferredDate ? new Date(req.body.preferredDate) : null,
    },
  });
  res.status(201).json({ data: fromDbStatus(repair), id: repair.id });
}

export async function update(req: Request, res: Response): Promise<void> {
  const repair = await prisma.repairRequest.findUnique({ where: { id: req.params.id } });
  if (!repair) throw AppError.notFound("Repair request not found");
  if (req.user!.accountType === "customer" && repair.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }

  const data = { ...req.body } as Record<string, unknown>;
  if (req.body.status) data.status = toDbStatus(req.body.status as ApiStatus);

  const updated = await prisma.repairRequest.update({
    where: { id: req.params.id },
    data: data as never,
  });
  res.json({ data: fromDbStatus(updated) });
}

// ─── Status transitions ─────────────────────────────────────

async function transition(
  id: string,
  nextStatus: DbStatus,
  extra: Record<string, unknown> = {},
): Promise<unknown> {
  const repair = await prisma.repairRequest.findUnique({ where: { id } });
  if (!repair) throw AppError.notFound("Repair request not found");

  const updated = await prisma.repairRequest.update({
    where: { id },
    data: { status: nextStatus, ...extra } as never,
    include: { vehicle: { select: { name: true } }, user: { select: { id: true } } },
  });

  // Notify customer of status change.
  await notificationsQueue.add(
    `repair-${id}-${nextStatus}`,
    {
      userId: updated.user.id,
      type: "repair_status",
      title: "Repair update",
      body: `Your ${updated.vehicle?.name ?? "vehicle"} repair is now ${nextStatus.replace("_", " ")}.`,
      data: { repairId: id, status: nextStatus },
    },
    { removeOnComplete: true, removeOnFail: 50 },
  );

  return fromDbStatus(updated);
}

export async function start(req: Request, res: Response): Promise<void> {
  const repair = await prisma.repairRequest.findUnique({ where: { id: req.params.id } });
  if (!repair) throw AppError.notFound("Repair request not found");
  // If no mechanic assigned yet, assign the calling staff member.
  const extra: Record<string, unknown> = {};
  if (!repair.assignedMechanicId) extra.assignedMechanicId = req.user!.userId;
  const updated = await transition(req.params.id, "in_progress", extra);
  res.json({ data: updated });
}

export async function complete(req: Request, res: Response): Promise<void> {
  const { actualCost } = (req.body ?? {}) as { actualCost?: number };
  const extra: Record<string, unknown> = {};
  if (typeof actualCost === "number") extra.actualCost = actualCost;
  const updated = await transition(req.params.id, "completed", extra);
  res.json({ data: updated });
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const repair = await prisma.repairRequest.findUnique({ where: { id: req.params.id } });
  if (!repair) throw AppError.notFound("Repair request not found");
  // Customer can cancel only their own; staff/admin can cancel anything.
  if (
    !STAFF_TYPES.has(req.user!.accountType) &&
    repair.userId !== req.user!.userId
  ) {
    throw AppError.forbidden();
  }
  const updated = await transition(req.params.id, "cancelled");
  res.json({ data: updated });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const repair = await prisma.repairRequest.findUnique({ where: { id: req.params.id } });
  if (!repair) throw AppError.notFound("Repair request not found");
  await prisma.repairRequest.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}
