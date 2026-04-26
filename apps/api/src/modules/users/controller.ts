import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

export async function list(req: Request, res: Response): Promise<void> {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

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
      avatarUrl: true,
      accountType: true,
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

export async function getById(req: Request, res: Response): Promise<void> {
  // Customers can only view their own profile
  if (req.user!.accountType === "customer" && req.params.id !== req.user!.userId) {
    throw AppError.forbidden();
  }

  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      avatarUrl: true,
      accountType: true,
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
  if (req.user!.accountType === "customer" && req.params.id !== req.user!.userId) {
    throw AppError.forbidden();
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: req.body,
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
  if (req.user!.accountType === "customer" && req.params.id !== req.user!.userId) {
    throw AppError.forbidden();
  }

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

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  // Only admins can delete any account; customers can delete their own
  if (req.user!.accountType === "customer" && req.params.id !== req.user!.userId) {
    throw AppError.forbidden();
  }

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

export async function getInteractions(req: Request, res: Response): Promise<void> {
  if (req.user!.accountType === "customer" && req.params.id !== req.user!.userId) {
    throw AppError.forbidden();
  }

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
