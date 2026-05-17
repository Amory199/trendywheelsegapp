import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { redis } from "../../config/redis.js";
import { AppError } from "../../utils/errors.js";

type Tx = Prisma.TransactionClient;

const VEHICLES_CACHE_TTL = 5 * 60; // 5 minutes
const VEHICLES_CACHE_PREFIX = "vehicles:list:";

// Prisma's VehicleType enum uses symbolic names (FOUR_SEATER) with @map() to
// the wire values ("4-seater") sent by the validator and the form. The Prisma
// client always wants the symbolic name, so translate before each write.
const VEHICLE_TYPE_MAP: Record<string, "FOUR_SEATER" | "SIX_SEATER" | "LED"> = {
  "4-seater": "FOUR_SEATER",
  "6-seater": "SIX_SEATER",
  LED: "LED",
};

const VEHICLE_CATEGORY_MAP: Record<string, string> = {
  "golf-cart": "golf_cart",
  "hover-board": "hover_board",
  scooter: "scooter",
  buggy: "buggy",
  utv: "utv",
  "jet-ski": "jet_ski",
};

function normalizeVehicleData<T extends { type?: unknown; category?: unknown }>(input: T): T {
  let out = input;
  if (typeof input.type === "string" && input.type in VEHICLE_TYPE_MAP) {
    out = { ...out, type: VEHICLE_TYPE_MAP[input.type] };
  }
  if (typeof input.category === "string" && input.category in VEHICLE_CATEGORY_MAP) {
    out = { ...out, category: VEHICLE_CATEGORY_MAP[input.category] };
  }
  return out;
}

export async function list(req: Request, res: Response): Promise<void> {
  const {
    type,
    category,
    priceMin,
    priceMax,
    available,
    page = 1,
    limit = 20,
  } = req.query as Record<string, string>;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);

  const listingType = (req.query.listingType ?? "") as string;

  const cacheKey = `${VEHICLES_CACHE_PREFIX}${JSON.stringify({ type, category, priceMin, priceMax, available, listingType, page, limit })}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    res.json(JSON.parse(cached));
    return;
  }

  const where: Record<string, unknown> = { status: { not: "inactive" } };
  if (type) where.type = type;
  if (category && category in VEHICLE_CATEGORY_MAP) where.category = VEHICLE_CATEGORY_MAP[category];
  if (available === "true") where.status = "available";
  if (listingType === "rent") where.listingType = { in: ["rent", "both"] };
  else if (listingType === "sale") where.listingType = { in: ["sale", "both"] };
  else if (listingType === "both") where.listingType = "both";
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

  const result = { data, total, page: pageNum, limit: limitNum };
  await redis.setex(cacheKey, VEHICLES_CACHE_TTL, JSON.stringify(result));
  res.setHeader("X-Cache", "MISS");
  res.json(result);
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
  const { images = [], ...rawData } = req.body as { images?: string[]; [k: string]: unknown };
  const vehicleData = normalizeVehicleData(rawData);

  const vehicle = await prisma.$transaction(async (tx: Tx) => {
    const created = await tx.vehicle.create({ data: vehicleData as Prisma.VehicleCreateInput });
    if (images.length > 0) {
      await tx.vehicleImage.createMany({
        data: images.map((url: string, idx: number) => ({
          vehicleId: created.id,
          url,
          sortOrder: idx,
        })),
      });
    }
    return tx.vehicle.findUnique({
      where: { id: created.id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
  });

  // Invalidate all vehicle list caches
  const keys = await redis.keys(`${VEHICLES_CACHE_PREFIX}*`);
  if (keys.length > 0) await redis.del(...keys);

  res.status(201).json({ data: vehicle, id: vehicle!.id });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { images, ...rawData } = req.body as { images?: string[]; [k: string]: unknown };
  const vehicleData = normalizeVehicleData(rawData);

  const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound("Vehicle not found");

  const vehicle = await prisma.$transaction(async (tx: Tx) => {
    const updated = await tx.vehicle.update({
      where: { id: req.params.id },
      data: vehicleData as Prisma.VehicleUpdateInput,
    });
    if (Array.isArray(images)) {
      await tx.vehicleImage.deleteMany({ where: { vehicleId: req.params.id } });
      if (images.length > 0) {
        await tx.vehicleImage.createMany({
          data: images.map((url: string, idx: number) => ({
            vehicleId: updated.id,
            url,
            sortOrder: idx,
          })),
        });
      }
    }
    return tx.vehicle.findUnique({
      where: { id: updated.id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
  });

  // Invalidate all vehicle list caches
  const updateKeys = await redis.keys(`${VEHICLES_CACHE_PREFIX}*`);
  if (updateKeys.length > 0) await redis.del(...updateKeys);

  res.json({ data: vehicle });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound("Vehicle not found");

  await prisma.vehicle.update({
    where: { id: req.params.id },
    data: { status: "inactive" },
  });

  // Invalidate all vehicle list caches
  const removeKeys = await redis.keys(`${VEHICLES_CACHE_PREFIX}*`);
  if (removeKeys.length > 0) await redis.del(...removeKeys);

  res.json({ success: true });
}
