import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { recordActivity } from "../crm/service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const { status, userId, vehicleId, page = 1, limit = 20 } = req.query as Record<string, string>;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (vehicleId) where.vehicleId = vehicleId;

  // Customers can only see their own bookings
  if (req.user!.accountType === "customer") {
    where.userId = req.user!.userId;
  }

  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { vehicle: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({ data, total, page: pageNum, limit: limitNum });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { vehicleId, startDate, endDate, promoCode, loyaltyPointsRedeemed } = req.body;
  const userId = req.user!.userId;

  // Check vehicle availability
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw AppError.notFound("Vehicle not found");
  if (vehicle.status !== "available") throw AppError.conflict("Vehicle is not available");

  // Check for overlapping bookings
  const overlap = await prisma.booking.findFirst({
    where: {
      vehicleId,
      status: "confirmed",
      startDate: { lte: new Date(endDate) },
      endDate: { gte: new Date(startDate) },
    },
  });
  if (overlap) throw AppError.conflict("Vehicle is already booked for these dates");

  // Calculate total cost
  const days = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  const baseCost = Number(vehicle.dailyRate) * Math.max(days, 1);

  // Apply promo code if provided
  let promoDiscount = 0;
  let validPromo: { id: string; code: string; kind: string; value: number } | null = null;
  if (promoCode) {
    const promo = await prisma.promoCode.findUnique({
      where: { code: String(promoCode).toUpperCase() },
    });
    if (
      promo &&
      promo.active &&
      (!promo.expiresAt || promo.expiresAt > new Date()) &&
      (!promo.usageLimit || promo.usedCount < promo.usageLimit) &&
      ["booking", "both"].includes(promo.appliesTo)
    ) {
      const v = Number(promo.value);
      promoDiscount =
        promo.kind === "percent"
          ? Math.round(baseCost * (v / 100) * 100) / 100
          : Math.min(v, baseCost);
      validPromo = { id: promo.id, code: promo.code, kind: promo.kind, value: v };
    }
  }

  // Apply loyalty redemption (1 pt = EGP 0.10, min 500 pts, max 50% of total)
  let loyaltyDiscount = 0;
  let loyaltyPts = 0;
  if (loyaltyPointsRedeemed && loyaltyPointsRedeemed >= 500) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const reqPts = Math.min(loyaltyPointsRedeemed, user?.loyaltyPoints ?? 0);
    const maxDiscount = (baseCost - promoDiscount) * 0.5;
    loyaltyDiscount = Math.min(reqPts * 0.1, maxDiscount);
    loyaltyPts = Math.ceil(loyaltyDiscount * 10);
  }

  const totalCost = Math.max(0, baseCost - promoDiscount - loyaltyDiscount);

  const booking = await prisma.booking.create({
    data: {
      userId,
      vehicleId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalCost,
      status: "confirmed",
      paymentStatus: "pending",
      promoCode: validPromo?.code ?? null,
      promoDiscount: promoDiscount > 0 ? promoDiscount : null,
      loyaltyPointsRedeemed: loyaltyPts,
      loyaltyDiscount: loyaltyDiscount > 0 ? loyaltyDiscount : null,
    },
  });

  // Persist promo redemption + decrement points if applicable
  if (validPromo) {
    await prisma.$transaction([
      prisma.promoRedemption.create({
        data: {
          promoId: validPromo.id,
          userId,
          bookingId: booking.id,
          discountAmount: promoDiscount,
        },
      }),
      prisma.promoCode.update({
        where: { id: validPromo.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);
  }
  if (loyaltyPts > 0) {
    await prisma.$transaction([
      prisma.loyaltyTransaction.create({
        data: {
          userId,
          points: -loyaltyPts,
          type: "redeemed",
          reason: `Booking ${booking.id} discount`,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { decrement: loyaltyPts } },
      }),
    ]);
  }

  // Increment vehicle booking count
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { totalBookings: { increment: 1 } },
  });

  // Update CRM lead — bump value, mark contacted, log activity.
  const lead = await prisma.lead.findUnique({ where: { customerId: userId } });
  if (lead) {
    const nextStatus = lead.status === "new" ? "qualified" : lead.status;
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        estimatedValue: { increment: totalCost },
        status: nextStatus,
        lastActivityAt: new Date(),
      },
    });
    await recordActivity(
      lead.id,
      null,
      "note",
      `Booked ${vehicle.name} for ${days} day${days === 1 ? "" : "s"} (EGP ${totalCost.toLocaleString()})`,
    );
  }

  res.status(201).json({ data: booking, id: booking.id });
}

export async function update(req: Request, res: Response): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");

  // Customers can only modify their own bookings
  if (req.user!.accountType === "customer" && booking.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: req.body,
  });

  // Booking-completion hook: award loyalty + check referral
  if (req.body.status === "completed" && booking.status !== "completed") {
    await onBookingCompleted(updated.id, updated.userId, Number(updated.totalCost));
  }

  res.json({ data: updated });
}

async function onBookingCompleted(
  bookingId: string,
  userId: string,
  totalCost: number,
): Promise<void> {
  // 1. Award loyalty points (10 pts per EGP 100, rounded down)
  const earnedPts = Math.floor(totalCost / 10);
  if (earnedPts > 0) {
    await prisma.$transaction([
      prisma.loyaltyTransaction.create({
        data: {
          userId,
          points: earnedPts,
          type: "earned",
          reason: `Completed booking ${bookingId}`,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: earnedPts } },
      }),
    ]);
  }

  // 2. Check referral: if this user was referred and this is their first completed booking,
  //    award 500 pts to both parties.
  const referral = await prisma.referral.findUnique({ where: { refereeId: userId } });
  if (referral && !referral.completedAt) {
    const completedCount = await prisma.booking.count({
      where: { userId, status: "completed" },
    });
    if (completedCount === 1) {
      await prisma.$transaction([
        prisma.referral.update({
          where: { id: referral.id },
          data: { completedAt: new Date(), rewardPaid: true },
        }),
        prisma.loyaltyTransaction.create({
          data: {
            userId: referral.referrerId,
            points: 500,
            type: "earned",
            reason: "Referral bonus",
          },
        }),
        prisma.loyaltyTransaction.create({
          data: {
            userId: referral.refereeId,
            points: 500,
            type: "earned",
            reason: "Welcome bonus (referred)",
          },
        }),
        prisma.user.update({
          where: { id: referral.referrerId },
          data: { loyaltyPoints: { increment: 500 } },
        }),
        prisma.user.update({
          where: { id: referral.refereeId },
          data: { loyaltyPoints: { increment: 500 } },
        }),
      ]);
    }
  }
}

const STAFF_TYPES = new Set(["admin", "staff"]);

export async function cancel(req: Request, res: Response): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");
  if (!STAFF_TYPES.has(req.user!.accountType) && booking.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }
  const wasPaid = booking.paymentStatus === "paid";
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "cancelled",
      paymentStatus: wasPaid ? "refunded" : booking.paymentStatus,
    },
  });
  res.json({ data: updated });
}

export async function markPaid(req: Request, res: Response): Promise<void> {
  if (!STAFF_TYPES.has(req.user!.accountType)) throw AppError.forbidden();
  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { paymentStatus: "paid" },
  });
  res.json({ data: updated });
}

export async function refund(req: Request, res: Response): Promise<void> {
  if (!STAFF_TYPES.has(req.user!.accountType)) throw AppError.forbidden();
  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { paymentStatus: "refunded" },
  });
  res.json({ data: updated });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");

  if (req.user!.accountType === "customer" && booking.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }

  await prisma.booking.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}
