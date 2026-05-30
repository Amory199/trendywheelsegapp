import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { requireOwner, scopeListToOwner } from "../../utils/auth-roles.js";
import { AppError } from "../../utils/errors.js";
import { emitDomainEvent, notifyAdmins, notifyUser } from "../../utils/notify.js";
import { recordActivity } from "../crm/service.js";

import { onBookingCompleted } from "./service.js";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

const STAFF_TYPES = new Set(["admin", "staff"]);

export async function list(req: Request, res: Response): Promise<void> {
  const { status, userId, vehicleId, page = 1, limit = 20 } = req.query as Record<string, string>;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (vehicleId) where.vehicleId = vehicleId;

  // Customers can only see their own bookings.
  scopeListToOwner(req, where);

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

  // Stock check: count active overlapping bookings against the vehicle's
  // quantity. A vehicle with quantity > 1 represents N identical units that
  // can be rented in parallel; quantity = 1 (default) is single-unit.
  const overlapCount = await prisma.booking.count({
    where: {
      vehicleId,
      status: { in: ["pending", "confirmed"] },
      startDate: { lte: new Date(endDate) },
      endDate: { gte: new Date(startDate) },
    },
  });
  if (overlapCount >= vehicle.quantity) {
    throw AppError.conflict("Out of stock for these dates");
  }

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
      status: "pending",
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

  // Notify staff that there's a pending booking to approve.
  await notifyAdmins(`booking-pending-${booking.id}`, {
    type: "booking_pending",
    title: "New booking awaiting approval",
    body: `${vehicle.name} · ${days} day${days === 1 ? "" : "s"} · EGP ${totalCost.toLocaleString()}`,
    data: { bookingId: booking.id, vehicleId, url: "/admin/bookings" },
  });

  emitDomainEvent("booking.created", booking.id, userId, {
    vehicleId,
    totalCost,
    status: booking.status,
  });
  res.status(201).json({ data: booking, id: booking.id });
}

export async function approve(req: Request, res: Response): Promise<void> {
  if (!STAFF_TYPES.has(req.user!.accountType)) throw AppError.forbidden();
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");
  if (booking.status !== "pending") {
    throw AppError.conflict(`Cannot approve a booking in status "${booking.status}"`);
  }
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "confirmed" },
  });
  emitDomainEvent("booking.updated", booking.id, booking.userId, { status: "confirmed" });
  await notifyUser(booking.userId, `booking-approved-${booking.id}`, {
    type: "booking_approved",
    title: "Booking confirmed",
    body: "Your booking has been approved. See you soon.",
    data: { bookingId: booking.id, url: `/rent/my-bookings` },
  });
  res.json({ data: updated });
}

export async function reject(req: Request, res: Response): Promise<void> {
  if (!STAFF_TYPES.has(req.user!.accountType)) throw AppError.forbidden();
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");
  if (booking.status !== "pending") {
    throw AppError.conflict(`Cannot reject a booking in status "${booking.status}"`);
  }
  const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "cancelled", notes: reason },
  });
  emitDomainEvent("booking.updated", booking.id, booking.userId, {
    status: "cancelled",
    reason,
  });
  await notifyUser(booking.userId, `booking-rejected-${booking.id}`, {
    type: "booking_rejected",
    title: "Booking declined",
    body: reason ?? "Your booking was declined. Please contact support.",
    data: { bookingId: booking.id, url: `/rent/my-bookings` },
  });
  res.json({ data: updated });
}

export async function update(req: Request, res: Response): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");

  // Customers can only modify their own bookings
  const isCustomer = req.user!.accountType === "customer";
  if (isCustomer && booking.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }

  // Customers may only cancel their own active bookings; the staff-only
  // status transitions (confirmed → in-progress → completed → refunded)
  // mint loyalty + referral payouts, so they must not be customer-driven.
  if (isCustomer && req.body.status && req.body.status !== "cancelled") {
    throw AppError.forbidden("Only staff can change booking status");
  }
  if (isCustomer && Object.prototype.hasOwnProperty.call(req.body, "paymentStatus")) {
    throw AppError.forbidden("Only staff can change payment status");
  }

  // Whitelist the fields a caller may set; explicit picks beat passing
  // req.body raw to Prisma so a future schema widening cannot silently
  // become a privilege gap.
  const body = req.body as Partial<{
    status: BookingStatus;
    paymentStatus: string;
    startDate: string;
    endDate: string;
    pickupLocation: string;
    returnLocation: string;
    notes: string;
  }>;
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.paymentStatus !== undefined) data.paymentStatus = body.paymentStatus;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.pickupLocation !== undefined) data.pickupLocation = body.pickupLocation;
  if (body.returnLocation !== undefined) data.returnLocation = body.returnLocation;
  if (body.notes !== undefined) data.notes = body.notes;

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: data as Prisma.BookingUpdateInput,
  });

  // Booking-completion hook: award loyalty + check referral
  if (body.status === "completed" && booking.status !== "completed") {
    await onBookingCompleted(updated.id, updated.userId, Number(updated.totalCost));
  }

  if (body.status && body.status !== booking.status) {
    emitDomainEvent("booking.updated", booking.id, booking.userId, { status: body.status });
  }
  res.json({ data: updated });
}

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

  requireOwner(req, booking.userId);

  await prisma.booking.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}
