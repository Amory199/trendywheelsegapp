import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

export async function list(req: Request, res: Response): Promise<void> {
  const { status, page = 1, limit = 20 } = req.query as Record<string, string>;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
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

  res.json({ data, total, page: pageNum, limit: limitNum });
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
  res.status(201).json({ data: repair, id: repair.id });
}

export async function update(req: Request, res: Response): Promise<void> {
  const repair = await prisma.repairRequest.findUnique({ where: { id: req.params.id } });
  if (!repair) throw AppError.notFound("Repair request not found");
  if (req.user!.accountType === "customer" && repair.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }

  const updated = await prisma.repairRequest.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data: updated });
}
