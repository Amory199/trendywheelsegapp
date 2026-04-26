import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

export async function list(req: Request, res: Response): Promise<void> {
  const { status, userId, page = 1, limit = 20 } = req.query as Record<string, string>;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const [data, total] = await Promise.all([
    prisma.salesListing.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: "desc" },
    }),
    prisma.salesListing.count({ where }),
  ]);

  res.json({ data, total, page: pageNum, limit: limitNum });
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
  const listing = await prisma.salesListing.create({
    data: { ...req.body, userId: req.user!.userId, status: "active", images: [] },
  });
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
  res.json({ success: true });
}
