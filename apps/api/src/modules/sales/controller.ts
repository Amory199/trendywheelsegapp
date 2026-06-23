import type { Request, Response } from "express";

import type { Prisma } from "@prisma/client";

import { redis } from "../../config/redis.js";
import { prisma } from "../../config/database.js";
import { requireOwner } from "../../utils/auth-roles.js";
import { AppError } from "../../utils/errors.js";
import { emitDomainEvent, notifyAdmins } from "../../utils/notify.js";

import {
  invalidateSalesCache,
  SALES_CACHE_PREFIX,
  SALES_CACHE_TTL,
  setListingStatus,
} from "./service.js";

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

// Admin/staff sales board. Unlike the public `list`, this returns listings of
// EVERY status (active, pending-review, sold) so customer-submitted listings —
// which are created "pending" — actually surface in the approval queue. The
// public route can't do this: it has no `authenticate`, so `req.user` is always
// undefined there and its staff branch was dead (INC-042). Optional `status`
// query narrows the board; owner info is included for the moderation drawer.
export async function listForAdmin(req: Request, res: Response): Promise<void> {
  const { status } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const data = await prisma.salesListing.findMany({
    where,
    include: { user: { select: { id: true, name: true, phone: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  res.json({ data });
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
  // Cast to the real create-input type (not `never`) so a future schema/Prisma
  // drift surfaces at compile time. `body` is the zod-validated payload (the
  // route runs validate({ body: createSalesListingSchema }), which strips
  // unknown keys), so fulfillmentType + dropoffLocationUrl flow through here.
  const listing = await prisma.salesListing.create({
    data: {
      ...body,
      userId: req.user!.userId,
      status: isStaffCreator ? "active" : "pending",
    } as Prisma.SalesListingUncheckedCreateInput,
  });
  await invalidateSalesCache();
  // Notify staff that a listing is awaiting approval.
  await notifyAdmins(`listing-pending-${listing.id}`, {
    type: "listing_pending",
    title: "New sale listing awaiting approval",
    body: listing.title ?? "Untitled listing",
    data: { listingId: listing.id },
  });
  emitDomainEvent("sales-listing.created", listing.id, req.user!.userId, {
    title: listing.title ?? null,
    status: listing.status,
  });
  res.status(201).json({ data: listing, id: listing.id });
}

export async function update(req: Request, res: Response): Promise<void> {
  const listing = await prisma.salesListing.findUnique({ where: { id: req.params.id } });
  if (!listing) throw AppError.notFound("Listing not found");
  requireOwner(req, listing.userId);

  const updated = await prisma.salesListing.update({
    where: { id: req.params.id },
    data: req.body,
  });
  await invalidateSalesCache();
  emitDomainEvent("sales-listing.updated", updated.id, updated.userId, {
    status: updated.status,
  });
  res.json({ data: updated });
}

const STAFF_TYPES = new Set(["admin", "staff"]);

async function setStatus(
  req: Request,
  res: Response,
  status: "active" | "sold" | "pending",
): Promise<void> {
  if (!STAFF_TYPES.has(req.user!.accountType)) throw AppError.forbidden();
  const listing = await setListingStatus(req.params.id, status);
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
  requireOwner(req, listing.userId);
  await prisma.salesListing.delete({ where: { id: req.params.id } });
  await invalidateSalesCache();
  res.json({ success: true });
}
