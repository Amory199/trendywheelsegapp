import type { Request, Response } from "express";

import { scheduleTransportSchema, submitTransportSchema } from "@trendywheels/validators";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

export async function submit(req: Request, res: Response): Promise<void> {
  const input = submitTransportSchema.parse(req.body);
  const item = await prisma.transportRequest.create({
    data: { ...input, userId: req.user!.userId },
  });
  res.status(201).json({ data: item });
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const items = await prisma.transportRequest.findMany({
    where: { userId: req.user!.userId },
    orderBy: { pickupAt: "desc" },
  });
  res.json({ data: items });
}

export async function listAll(_req: Request, res: Response): Promise<void> {
  const items = await prisma.transportRequest.findMany({
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { pickupAt: "desc" },
    take: 200,
  });
  res.json({ data: items });
}

export async function schedule(req: Request, res: Response): Promise<void> {
  const input = scheduleTransportSchema.parse(req.body);
  const updated = await prisma.transportRequest.update({
    where: { id: req.params.id },
    data: input,
  });
  res.json({ data: updated });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const item = await prisma.transportRequest.findUnique({ where: { id: req.params.id } });
  if (!item) throw AppError.notFound("Transport request not found");
  const isStaff = req.user!.accountType === "admin" || req.user!.accountType === "staff";
  if (!isStaff && item.userId !== req.user!.userId) throw AppError.forbidden();
  res.json({ data: item });
}
