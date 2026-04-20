import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

export async function list(req: Request, res: Response): Promise<void> {
  const {
    type,
    priceMin,
    priceMax,
    available,
    page = 1,
    limit = 20,
  } = req.query as Record<string, string>;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (available === "true") where.status = "available";
  if (priceMin || priceMax) {
    where.dailyRate = {};
    if (priceMin) (where.dailyRate as Record<string, unknown>).gte = Number(priceMin);
    if (priceMax) (where.dailyRate as Record<string, unknown>).lte = Number(priceMax);
  }

  const [data, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { images: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vehicle.count({ where }),
  ]);

  res.json({ data, total, page: pageNum, limit: limitNum });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: req.params.id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  if (!vehicle) throw AppError.notFound("Vehicle not found");
  res.json({ data: vehicle });
}

export async function create(req: Request, res: Response): Promise<void> {
  const vehicle = await prisma.vehicle.create({ data: req.body });
  res.status(201).json({ data: vehicle, id: vehicle.id });
}

export async function update(req: Request, res: Response): Promise<void> {
  const vehicle = await prisma.vehicle.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data: vehicle });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await prisma.vehicle.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}
