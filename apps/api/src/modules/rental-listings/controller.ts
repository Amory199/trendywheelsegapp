import type { Request, Response } from "express";

import { createRentalListingSchema, updateRentalListingSchema } from "@trendywheels/validators";

import { prisma } from "../../config/database.js";
import { isAdmin, requireOwner } from "../../utils/auth-roles.js";
import { AppError } from "../../utils/errors.js";

import { createRentalListing, transitionRentalListing } from "./service.js";

// Validator accepts kebab-case categories ("golf-cart") to match the public
// sales API. Prisma enum is snake_case ("golf_cart"). Conversion happens here.
const CATEGORY_TO_DB: Record<
  string,
  "golf_cart" | "hover_board" | "scooter" | "scooter_sidecar" | "buggy" | "utv" | "jet_ski"
> = {
  "golf-cart": "golf_cart",
  "hover-board": "hover_board",
  scooter: "scooter",
  "scooter-sidecar": "scooter_sidecar",
  buggy: "buggy",
  utv: "utv",
  "jet-ski": "jet_ski",
};

export async function submit(req: Request, res: Response): Promise<void> {
  const input = createRentalListingSchema.parse(req.body);
  const created = await createRentalListing(req.user!.userId, {
    ...input,
    category: CATEGORY_TO_DB[input.category],
  });
  res.status(201).json({ data: created });
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const items = await prisma.rentalListing.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: items });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const item = await prisma.rentalListing.findUnique({ where: { id: req.params.id } });
  if (!item) throw AppError.notFound("Rental listing not found");
  requireOwner(req, item.userId);
  res.json({ data: item });
}

export async function update(req: Request, res: Response): Promise<void> {
  const existing = await prisma.rentalListing.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound("Rental listing not found");
  requireOwner(req, existing.userId);

  const input = updateRentalListingSchema.parse(req.body);
  // Reviewers = admin + staff. The owner widened listing approval to staff, and
  // the admin board was widened to match; without this the staff approvals tab
  // would list submissions whose Approve/Decline buttons 403 every time.
  const admin =
    isAdmin(req.user) || req.user?.accountType === "staff" || req.user?.accountType === "admin";

  // Listing owners can only pause / withdraw. Reviewers can do anything.
  if (!admin) {
    const allowedOwnerStatuses = new Set(["paused", "withdrawn"]);
    if (input.status && !allowedOwnerStatuses.has(input.status)) {
      throw AppError.forbidden("Only admins can transition to that status");
    }
    if (input.declineReason !== undefined || input.vehicleId !== undefined) {
      throw AppError.forbidden("Only admins can set decline reason or link a vehicle");
    }
  }

  const updated = await transitionRentalListing(
    req.params.id,
    input,
    admin ? req.user!.userId : undefined,
  );
  res.json({ data: updated });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const existing = await prisma.rentalListing.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound("Rental listing not found");
  requireOwner(req, existing.userId);

  if (!isAdmin(req.user)) {
    const deletableStatuses = new Set(["submitted", "withdrawn"]);
    if (!deletableStatuses.has(existing.status)) {
      throw AppError.forbidden("Listing can only be deleted while submitted or withdrawn");
    }
  }

  await prisma.rentalListing.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

// Admin-only — full directory across all customers.
export async function listAll(_req: Request, res: Response): Promise<void> {
  const items = await prisma.rentalListing.findMany({
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ data: items });
}
