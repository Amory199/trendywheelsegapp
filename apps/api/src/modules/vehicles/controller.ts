import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { redis } from "../../config/redis.js";
import { AppError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import { notifyCustomers } from "../../utils/notify.js";

import { syncVehicleProduct } from "./product-sync.js";

type Tx = Prisma.TransactionClient;

const VEHICLES_CACHE_TTL = 5 * 60; // 5 minutes
const VEHICLES_CACHE_PREFIX = "vehicles:list:";

// Prisma's VehicleType enum uses symbolic names (OFF_ROAD) with @map() to the
// wire values ("off-road") sent by the validator and the form. The Prisma
// client always wants the symbolic name, so translate before each write.
const VEHICLE_TYPE_MAP: Record<string, "OFF_ROAD" | "ON_ROAD" | "UTILITY" | "LUXURY"> = {
  "off-road": "OFF_ROAD",
  "on-road": "ON_ROAD",
  utility: "UTILITY",
  luxury: "LUXURY",
};

const VEHICLE_CATEGORY_MAP: Record<string, string> = {
  "golf-cart": "golf_cart",
  "hover-board": "hover_board",
  scooter: "scooter",
  "scooter-sidecar": "scooter_sidecar",
  buggy: "buggy",
  utv: "utv",
  "jet-ski": "jet_ski",
};

// Reverse maps. Prisma returns enum MEMBER names (golf_cart / FOUR_SEATER), but
// every client — the admin forms and the mobile app — speaks the kebab DB
// labels (golf-cart / 4-seater). Map back on the way OUT so category/type
// round-trip cleanly; without this, saving a vehicle in the admin rewrites the
// value into a member-name the edit form's selects can no longer match, so it
// reappears as "choose a category" / an unset type on the next open.
const VEHICLE_CATEGORY_OUT: Record<string, string> = Object.fromEntries(
  Object.entries(VEHICLE_CATEGORY_MAP).map(([kebab, member]) => [member, kebab]),
);
const VEHICLE_TYPE_OUT: Record<string, string> = Object.fromEntries(
  Object.entries(VEHICLE_TYPE_MAP).map(([kebab, member]) => [member, kebab]),
);

function serializeVehicle<T extends Record<string, unknown>>(vehicle: T): T {
  let out: Record<string, unknown> = vehicle;
  if (typeof out.category === "string" && out.category in VEHICLE_CATEGORY_OUT) {
    out = { ...out, category: VEHICLE_CATEGORY_OUT[out.category] };
  }
  if (typeof out.type === "string" && out.type in VEHICLE_TYPE_OUT) {
    out = { ...out, type: VEHICLE_TYPE_OUT[out.type] };
  }
  return out as T;
}

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
  if (type && type in VEHICLE_TYPE_MAP) where.type = VEHICLE_TYPE_MAP[type];
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

  const result = { data: data.map(serializeVehicle), total, page: pageNum, limit: limitNum };
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
  res.json({ data: serializeVehicle(vehicle) });
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

  // Vehicles are the single inventory source — sale/both listings keep a
  // Buy-section product in sync automatically.
  await syncVehicleProduct(vehicle!.id);

  // Announce the new listing to every customer (one blast per vehicle —
  // the per-user job id dedupes retries). Marketing-tier push: user push
  // prefs + the daily fatigue cap apply. Best-effort: a notify failure must
  // never fail the admin's vehicle save. Smoke-test runs create throwaway
  // vehicles every deploy — never announce those to real customers.
  const smokeUa = String(req.get("user-agent") ?? "").startsWith("tw-smoke-test");
  if (vehicle!.status === "available" && !smokeUa) {
    const forSale = vehicle!.listingType === "sale" || vehicle!.listingType === "both";
    notifyCustomers(`new-listing-${vehicle!.id}`, {
      type: "new_listing",
      title: "New ride just landed 🛞",
      body: forSale
        ? `${vehicle!.name} is now up for grabs on TrendyWheels — be the first to see it`
        : `${vehicle!.name} is now available to rent on TrendyWheels — take a look`,
      data: { vehicleId: vehicle!.id, listingType: vehicle!.listingType },
    }).catch((err) => logger.warn({ err }, "new-listing announcement failed (non-fatal)"));
  }

  res.status(201).json({ data: serializeVehicle(vehicle!), id: vehicle!.id });
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

  await syncVehicleProduct(req.params.id);

  res.json({ data: serializeVehicle(vehicle!) });
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

  await syncVehicleProduct(req.params.id); // hides the linked Buy product

  res.json({ success: true });
}

// PATCH /vehicles/:id/status — sales agents flip a vehicle between
// available / reserved / sold without opening the admin web. Records a
// vehicle_status_changes audit row that v1.2 commission attribution reads
// to figure out who closed which car.
export async function setStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { toStatus, customerId, dealNote } = req.body as {
    toStatus: "available" | "reserved" | "sold";
    customerId?: string | null;
    dealNote?: string | null;
  };

  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Vehicle not found");
  if (existing.status === toStatus) {
    res.json({ data: existing });
    return;
  }

  const updated = await prisma.$transaction(async (tx: Tx) => {
    await tx.vehicleStatusChange.create({
      data: {
        vehicleId: id,
        fromStatus: existing.status,
        toStatus,
        actorId: req.user!.userId,
        customerId: customerId ?? null,
        dealNote: dealNote ?? null,
      },
    });
    return tx.vehicle.update({ where: { id }, data: { status: toStatus } });
  });

  const keys = await redis.keys(`${VEHICLES_CACHE_PREFIX}*`);
  if (keys.length > 0) await redis.del(...keys);

  // sold/reserved hides the linked Buy product; back to available re-lists it
  await syncVehicleProduct(id);

  res.json({ data: updated });
}
