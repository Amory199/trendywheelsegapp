import type { Request, Response } from "express";

import { isVehicleOnSale } from "@trendywheels/types";
import {
  createProductSchema,
  productListQuerySchema,
  updateProductSchema,
} from "@trendywheels/validators";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

// A cart product can be linked (vehicleId) to a Vehicle that is on sale. The
// sale lives on the Vehicle, so the Buy feed never showed it. Surface the
// linked vehicle's sale price onto the product (salePrice/originalPriceEgp)
// when that vehicle is genuinely discounted — same rule as the home rail
// (isVehicleOnSale) — so Buy and On-Sale always agree. Returns a plain object
// without the nested vehicle relation.
function withVehicleSale<
  T extends {
    vehicle?: { salePrice: unknown; originalPriceEgp: unknown; category?: unknown } | null;
  },
>(
  product: T,
): Omit<T, "vehicle"> & {
  salePrice?: unknown;
  originalPriceEgp?: unknown;
  vehicleCategory?: unknown;
} {
  const { vehicle, ...rest } = product;
  // Surface the linked vehicle's category so the Buy page can filter carts by
  // vehicle category (golf-cart / scooter / …) the way Rent does. The DB enum
  // uses underscores (golf_cart) but the public API + mobile taxonomy use
  // dashes (golf-cart) — serialize like the vehicles endpoint does.
  const vehicleCategory = vehicle?.category ? String(vehicle.category).replace(/_/g, "-") : null;
  if (vehicle && isVehicleOnSale(vehicle as never)) {
    return {
      ...rest,
      salePrice: vehicle.salePrice,
      originalPriceEgp: vehicle.originalPriceEgp,
      vehicleCategory,
    };
  }
  return { ...rest, vehicleCategory };
}

const SALE_SELECT = {
  select: { salePrice: true, originalPriceEgp: true, category: true },
} as const;

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
      include: { vehicle: SALE_SELECT },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({ data: data.map(withVehicleSale), total, page: q.page, limit: q.limit });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { vehicle: SALE_SELECT },
  });
  if (!product) throw AppError.notFound("Product not found");
  res.json({ data: withVehicleSale(product) });
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
