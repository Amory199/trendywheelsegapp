import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

export async function list(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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
  });
  res.json({ data: users });
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
