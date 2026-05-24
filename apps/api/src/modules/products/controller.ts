import type { Request, Response } from "express";

import {
  createProductSchema,
  productListQuerySchema,
  updateProductSchema,
} from "@trendywheels/validators";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

export async function list(req: Request, res: Response): Promise<void> {
  const q = productListQuerySchema.parse(req.query);
  const where: Record<string, unknown> = {};
  if (q.category) where.category = q.category;
  if (q.inStock !== undefined) where.inStock = q.inStock;
  else if (!req.user || req.user.accountType === "customer") where.inStock = true;
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    where.priceEgp = {
      ...(q.minPrice !== undefined && { gte: q.minPrice }),
      ...(q.maxPrice !== undefined && { lte: q.maxPrice }),
    };
  }

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({ data, total, page: q.page, limit: q.limit });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { vehicle: true },
  });
  if (!product) throw AppError.notFound("Product not found");
  res.json({ data: product });
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createProductSchema.parse(req.body);
  const data: Record<string, unknown> = { ...input };
  if (data.vehicleId === null) data.vehicleId = undefined;
  if (data.stockCount === null) data.stockCount = undefined;
  const product = await prisma.product.create({ data: data as never });
  res.status(201).json({ data: product });
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updateProductSchema.parse(req.body);
  const data: Record<string, unknown> = { ...input };
  if (data.vehicleId === null) data.vehicleId = undefined;
  if (data.stockCount === null) data.stockCount = undefined;
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: data as never,
  });
  res.json({ data: product });
}

export async function remove(req: Request, res: Response): Promise<void> {
  // Soft-delete: mark out of stock instead of deleting (keeps order history intact).
  await prisma.product.update({
    where: { id: req.params.id },
    data: { inStock: false, stockCount: 0 },
  });
  res.json({ success: true });
}
