import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

const PRODUCT_CATEGORIES = ["cart_new", "cart_used", "parts", "accessory"] as const;

const productCreateSchema = z.object({
  category: z.enum(PRODUCT_CATEGORIES),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priceEgp: z.coerce.number().positive(),
  images: z.array(z.string().url()).default([]),
  inStock: z.boolean().default(true),
  stockCount: z.coerce.number().int().nonnegative().optional().nullable(),
  attributes: z.record(z.unknown()).default({}),
  vehicleId: z.string().uuid().optional().nullable(),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
});

const productUpdateSchema = productCreateSchema.partial();

const listQuerySchema = z.object({
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export async function list(req: Request, res: Response): Promise<void> {
  const q = listQuerySchema.parse(req.query);
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
  const input = productCreateSchema.parse(req.body);
  const data: Record<string, unknown> = { ...input };
  if (data.vehicleId === null) data.vehicleId = undefined;
  if (data.stockCount === null) data.stockCount = undefined;
  const product = await prisma.product.create({ data: data as never });
  res.status(201).json({ data: product });
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = productUpdateSchema.parse(req.body);
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
