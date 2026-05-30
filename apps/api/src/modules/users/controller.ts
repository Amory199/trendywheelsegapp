import type { Request, Response } from "express";

import { Prisma } from "@prisma/client";
import {
  createStaffSchema,
  requestAccountDeletionSchema,
  updateUserPreferencesSchema,
  updateUserSchema,
  userPreferencesSchema,
} from "@trendywheels/validators";
import bcrypt from "bcryptjs";

import { PAGINATION } from "../../config/limits.js";
import { prisma } from "../../config/database.js";
import { requireOwner } from "../../utils/auth-roles.js";
import { AppError } from "../../utils/errors.js";

import { buildCustomerTimeline, mergePreferences } from "./service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(PAGINATION.max, Math.max(1, Number(limit)));

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        avatarUrl: true,
        accountType: true,
        status: true,
        loyaltyTier: true,
        loyaltyPoints: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
  ]);
  res.json({ data: users, total, page: pageNum, limit: limitNum });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      age: true,
      avatarUrl: true,
      accountType: true,
      staffRole: true,
      status: true,
      preferences: true,
      loyaltyTier: true,
      loyaltyPoints: true,
      createdAt: true,
    },
  });
  if (!user) throw AppError.notFound("User not found");
  res.json({ data: user });
}

// PATCH /api/users/me/preferences
// Deep-merges the patch into existing user.preferences. The merged result is
// re-validated against userPreferencesSchema before save — so a malformed
// existing JSON column gets normalized on first write, and unknown keys are
// silently dropped instead of accumulating drift.
export async function updateMyPreferences(req: Request, res: Response): Promise<void> {
  const patch = updateUserPreferencesSchema.parse(req.body);

  const current = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { preferences: true },
  });
  if (!current) throw AppError.notFound("User not found");

  const merged = mergePreferences(current.preferences, patch);
  const normalized = userPreferencesSchema.parse(merged);

  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { preferences: normalized as unknown as Prisma.InputJsonValue },
    select: { preferences: true },
  });

  res.json({ data: updated.preferences });
}

export async function getById(req: Request, res: Response): Promise<void> {
  // Customers can only view their own profile
  requireOwner(req, req.params.id);

  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      age: true,
      avatarUrl: true,
      accountType: true,
      staffRole: true,
      status: true,
      preferences: true,
      loyaltyTier: true,
      loyaltyPoints: true,
      createdAt: true,
    },
  });
  if (!user) throw AppError.notFound("User not found");
  res.json({ data: user });
}

export async function update(req: Request, res: Response): Promise<void> {
  // Customers can only update their own profile
  requireOwner(req, req.params.id);

  const parsed = updateUserSchema.parse(req.body);
  // Privilege fields are admin-only — strip silently for any non-admin caller
  // so customers/staff cannot self-promote, unsuspend, or change role.
  const isAdmin = req.user!.accountType === "admin";
  const baseData = isAdmin
    ? parsed
    : (() => {
        const { accountType: _at, staffRole: _sr, status: _st, ...rest } = parsed;
        return rest;
      })();

  // Prisma's nullable JSON columns reject raw `null` — they need the explicit
  // `Prisma.DbNull` sentinel. Mobile sends preferences:null when the user
  // hasn't touched the prefs editor yet; translate it here so the PUT doesn't
  // crash with a Zod-passes-Prisma-rejects error.
  const { preferences, ...rest } = baseData;
  const data: Record<string, unknown> = { ...rest };
  if (preferences !== undefined) {
    data.preferences = preferences === null ? Prisma.DbNull : preferences;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      avatarUrl: true,
      accountType: true,
      preferences: true,
      loyaltyTier: true,
      loyaltyPoints: true,
    },
  });
  res.json({ data: user });
}

export async function exportData(req: Request, res: Response): Promise<void> {
  // Users can only export their own data; admins can export any
  requireOwner(req, req.params.id);

  const userId = req.params.id;
  const [user, bookings, repairs, tickets, listings, messages] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.booking.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.repairRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.salesListing.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.message.findMany({ where: { senderId: userId }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!user) throw AppError.notFound("User not found");

  res.json({
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      accountType: user.accountType,
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
      createdAt: user.createdAt,
    },
    bookings,
    repairs,
    tickets,
    listings,
    messages,
  });
}

// Public endpoint backing the /account/delete form (Google Play Store requires
// a self-service deletion path accessible without app login). Creates a
// DeletionRequest the ops team processes within 30 days, in line with our
// privacy policy.
export async function requestDeletion(req: Request, res: Response): Promise<void> {
  const { email, phone, reason } = requestAccountDeletionSchema.parse(req.body);

  // Best-effort link to an existing user (by email or phone) but the request is
  // still recorded even if no match — ops verifies offline.
  const user = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { id: true },
  });

  await prisma.deletionRequest.create({
    data: { email, phone, reason, userId: user?.id ?? null },
  });

  res.status(202).json({
    message:
      "Deletion request received. We'll process it within 30 days and email you when complete.",
  });
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  // Only admins can delete any account; customers can delete their own
  requireOwner(req, req.params.id);

  const userId = req.params.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");

  // Soft delete: anonymize PII fields, set status to INACTIVE
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: "Deleted User",
      email: null,
      phone: `deleted_${userId}`,
      avatarUrl: null,
      status: "inactive",
    },
  });

  res.json({ message: "Account deleted and personal data anonymized" });
}

export async function disable(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: "suspended" },
    select: { id: true, status: true },
  });
  // Revoke active refresh tokens so the user is logged out everywhere.
  await prisma.refreshToken.updateMany({
    where: { userId: req.params.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  res.json({ data: user });
}

export async function enable(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: "active" },
    select: { id: true, status: true },
  });
  res.json({ data: user });
}

export async function createStaff(req: Request, res: Response): Promise<void> {
  const input = createStaffSchema.parse(req.body);
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
    select: { id: true, email: true, phone: true },
  });
  if (existing) {
    throw AppError.conflict(
      existing.email === input.email ? "Email already in use" : "Phone already in use",
      "USER_EXISTS",
    );
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      accountType: input.staffRole === "admin" ? "admin" : "staff",
      staffRole: input.staffRole,
      status: "active",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      accountType: true,
      staffRole: true,
      status: true,
      createdAt: true,
    },
  });
  res.status(201).json({ data: user });
}

export async function getInteractions(req: Request, res: Response): Promise<void> {
  requireOwner(req, req.params.id);

  const userId = req.params.id;
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const [bookings, repairs, tickets] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      take: limitNum,
      skip: (pageNum - 1) * limitNum,
      orderBy: { createdAt: "desc" },
    }),
    prisma.repairRequest.findMany({
      where: { userId },
      take: limitNum,
      skip: (pageNum - 1) * limitNum,
      orderBy: { createdAt: "desc" },
    }),
    prisma.supportTicket.findMany({
      where: { userId },
      take: limitNum,
      skip: (pageNum - 1) * limitNum,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  res.json({
    data: {
      bookings,
      repairs,
      tickets,
    },
  });
}

// Per-customer activity timeline. Returns a unified, chronologically-sorted
// list of every entity the customer has touched. Admin/staff only — the auth
// gate is in routes.ts.
export async function getTimeline(req: Request, res: Response): Promise<void> {
  const data = await buildCustomerTimeline(req.params.id);
  res.json({ data });
}
