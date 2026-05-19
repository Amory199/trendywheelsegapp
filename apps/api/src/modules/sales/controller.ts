import type { Request, Response } from "express";

import { redis } from "../../config/redis.js";
import { prisma } from "../../config/database.js";
import { notificationsQueue } from "../../queues/index.js";
import { AppError } from "../../utils/errors.js";

const SALES_CACHE_TTL = 60;
const SALES_CACHE_PREFIX = "sales:list:";

async function invalidateSalesCache(): Promise<void> {
  const keys = await redis.keys(`${SALES_CACHE_PREFIX}*`);
  if (keys.length > 0) await redis.del(...keys);
}

const CATEGORY_MAP: Record<string, string> = {
  "golf-cart": "golf_cart",
  "hover-board": "hover_board",
  scooter: "scooter",
  buggy: "buggy",
  utv: "utv",
  "jet-ski": "jet_ski",
};

export async function list(req: Request, res: Response): Promise<void> {
  const { status, userId, category, page = 1, limit = 20 } = req.query as Record<string, string>;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const where: Record<string, unknown> = {};
  // Public callers only see active listings — staff/admin can pass an
  // explicit status filter to inspect pending/sold/withdrawn rows.
  const isStaff = req.user?.accountType === "admin" || req.user?.accountType === "staff";
  if (status && isStaff) where.status = status;
  else where.status = "active";
  if (userId) where.userId = userId;
  if (category && category in CATEGORY_MAP) where.category = CATEGORY_MAP[category];

  // Cache only the public/anonymous unfiltered case — that's the hot path
  // (customer browse). Staff filters bypass cache to keep them fresh.
  const isCacheable = !req.user && !status && !userId && !category;
  const cacheKey = `${SALES_CACHE_PREFIX}${pageNum}:${limitNum}`;
  if (isCacheable) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.json(JSON.parse(cached));
      return;
    }
  }

  const [data, total] = await Promise.all([
    prisma.salesListing.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: "desc" },
    }),
    prisma.salesListing.count({ where }),
  ]);

  const result = { data, total, page: pageNum, limit: limitNum };
  if (isCacheable) {
    await redis.setex(cacheKey, SALES_CACHE_TTL, JSON.stringify(result));
    res.setHeader("X-Cache", "MISS");
  }
  res.json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const listing = await prisma.salesListing.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, name: true, phone: true, avatarUrl: true } } },
  });
  if (!listing) throw AppError.notFound("Listing not found");

  await prisma.salesListing.update({
    where: { id: req.params.id },
    data: { viewsCount: { increment: 1 } },
  });

  res.json({ data: listing });
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  if (typeof body.category === "string" && body.category in CATEGORY_MAP) {
    body.category = CATEGORY_MAP[body.category];
  }
  // Staff-created listings start "active" (no review queue); customer-created
  // start "pending" until staff approve. Either way, images come from the body.
  const isStaffCreator = req.user!.accountType !== "customer";
  const listing = await prisma.salesListing.create({
    data: {
      ...body,
      userId: req.user!.userId,
      status: isStaffCreator ? "active" : "pending",
    } as never,
  });
  await invalidateSalesCache();
  // Notify staff that a listing is awaiting approval.
  const staff = await prisma.user.findMany({
    where: { accountType: { in: ["admin", "staff"] }, status: "active" },
    select: { id: true },
  });
  await Promise.all(
    staff.map((s) =>
      notificationsQueue.add(
        `listing-pending-${listing.id}-${s.id}`,
        {
          userId: s.id,
          type: "listing_pending",
          title: "New sale listing awaiting approval",
          body: listing.title ?? "Untitled listing",
          data: { listingId: listing.id },
        },
        { removeOnComplete: true },
      ),
    ),
  );
  res.status(201).json({ data: listing, id: listing.id });
}

export async function update(req: Request, res: Response): Promise<void> {
  const listing = await prisma.salesListing.findUnique({ where: { id: req.params.id } });
  if (!listing) throw AppError.notFound("Listing not found");
  if (req.user!.accountType === "customer" && listing.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }

  const updated = await prisma.salesListing.update({
    where: { id: req.params.id },
    data: req.body,
  });
  await invalidateSalesCache();
  res.json({ data: updated });
}

const STAFF_TYPES = new Set(["admin", "staff"]);

async function setStatus(
  req: Request,
  res: Response,
  status: "active" | "sold" | "pending",
): Promise<void> {
  if (!STAFF_TYPES.has(req.user!.accountType)) throw AppError.forbidden();
  const listing = await prisma.salesListing.update({
    where: { id: req.params.id },
    data: { status },
  });
  await invalidateSalesCache();
  res.json({ data: listing });
}

export async function markSold(req: Request, res: Response): Promise<void> {
  await setStatus(req, res, "sold");
}

export async function takeDown(req: Request, res: Response): Promise<void> {
  await setStatus(req, res, "pending");
}

export async function restore(req: Request, res: Response): Promise<void> {
  await setStatus(req, res, "active");
}

export async function remove(req: Request, res: Response): Promise<void> {
  const listing = await prisma.salesListing.findUnique({ where: { id: req.params.id } });
  if (!listing) throw AppError.notFound("Listing not found");
  if (req.user!.accountType === "customer" && listing.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }
  await prisma.salesListing.delete({ where: { id: req.params.id } });
  await invalidateSalesCache();
  res.json({ success: true });
}
