import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import {
  blockedDatesInRange,
  BOOKING_STAGES,
  canAdvance,
  LOYALTY,
  rentalDays,
  rentalQuote,
  stageIndex,
  unavailableWeekdays,
  WEEKDAY_LABELS,
  type BookingStage,
} from "@trendywheels/types";
import { advanceStageSchema } from "@trendywheels/validators";

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
      // user (+ id images) so the admin booking drawer can verify the renter.
      include: {
        vehicle: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            idFrontUrl: true,
            idBackUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({ data, total, page: pageNum, limit: limitNum });
}

export async function create(req: Request, res: Response): Promise<void> {
  const {
    vehicleId,
    startDate,
    endDate,
    promoCode,
    loyaltyPointsRedeemed,
    dropoffLocationUrl,
    fulfillmentType,
    paymentMethod,
  } = req.body;
  const userId = req.user!.userId;

  // Check vehicle availability
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw AppError.notFound("Vehicle not found");
  if (vehicle.status !== "available") throw AppError.conflict("Vehicle is not available");
  // Sale-only vehicles have no dailyRate (nullable since 20260630120000) —
  // without this guard Number(null) * days = 0 and the booking is free.
  if (vehicle.listingType === "sale" || vehicle.dailyRate == null) {
    throw AppError.badRequest("This vehicle is not available for rent");
  }

  // Weekly availability: the vehicle may only be rentable on certain weekdays
  // (availableDays, 0=Sun … 6=Sat). Empty = every day. Reject any range that
  // touches a weekday it isn't available on, naming the offending days so the
  // customer gets a specific message instead of a generic "invalid" error.
  const blockedDays = unavailableWeekdays(
    startDate as string,
    endDate as string,
    vehicle.availableDays,
  );
  if (blockedDays.length > 0) {
    const bad = blockedDays.map((d) => WEEKDAY_LABELS[d]).join(", ");
    const open = vehicle.availableDays
      .slice()
      .sort((a, b) => a - b)
      .map((d) => WEEKDAY_LABELS[d])
      .join("/");
    throw AppError.badRequest(
      `Not available on ${bad}. This vehicle rents on ${open} only — pick dates on those days.`,
      "VEHICLE_DAY_UNAVAILABLE",
    );
  }

  // One-off admin blackout dates (maintenance / holidays) within the range.
  const blockedHit = blockedDatesInRange(
    startDate as string,
    endDate as string,
    vehicle.blockedDates,
  );
  if (blockedHit.length > 0) {
    throw AppError.badRequest(
      `Not available on ${blockedHit.join(", ")} — those dates are blocked. Please pick other days.`,
      "VEHICLE_DATE_BLOCKED",
    );
  }

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

  // Calculate total cost — cheapest mix of daily/weekly/monthly blocks (shared
  // rentalQuote so the app estimate and the charge can never disagree).
  const days = rentalDays(startDate as string, endDate as string);
  const baseCost = rentalQuote(days, {
    daily: Number(vehicle.dailyRate),
    weekly: vehicle.weeklyRate != null ? Number(vehicle.weeklyRate) : null,
    monthly: vehicle.monthlyRate != null ? Number(vehicle.monthlyRate) : null,
  }).total;

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

  // Apply loyalty redemption (rates centralized in @trendywheels/types so the
  // server charge can never disagree with the customer-app estimate).
  let loyaltyDiscount = 0;
  let loyaltyPts = 0;
  if (loyaltyPointsRedeemed && loyaltyPointsRedeemed >= LOYALTY.MIN_REDEEM_POINTS) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const reqPts = Math.min(loyaltyPointsRedeemed, user?.loyaltyPoints ?? 0);
    const maxDiscount = (baseCost - promoDiscount) * LOYALTY.MAX_DISCOUNT_FRACTION;
    loyaltyDiscount = Math.min(reqPts * LOYALTY.REDEEM_VALUE_PER_POINT, maxDiscount);
    loyaltyPts = Math.ceil(loyaltyDiscount / LOYALTY.REDEEM_VALUE_PER_POINT);
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
      dropoffLocationUrl: dropoffLocationUrl ?? null,
      fulfillmentType: fulfillmentType ?? null,
      paymentMethod: paymentMethod ?? "cash",
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

  // Rescheduling must re-price and re-check stock — otherwise a customer could
  // book 1 day then stretch endDate to 60 and keep the 1-day total. The server
  // is the sole source of truth for the price; a client-sent total is ignored.
  const datesChanged = body.startDate !== undefined || body.endDate !== undefined;
  if (datesChanged) {
    const newStart = (data.startDate as Date) ?? booking.startDate;
    const newEnd = (data.endDate as Date) ?? booking.endDate;
    if (newEnd <= newStart) {
      throw AppError.badRequest("Return date must be after the pickup date");
    }
    // Once money is committed the window is locked — a paid or past-pending
    // booking can only be rescheduled by staff, never silently by the customer.
    if (isCustomer && (booking.paymentStatus === "paid" || booking.status !== "pending")) {
      throw AppError.forbidden("This booking can no longer be rescheduled — contact support");
    }
    const vehicle = await prisma.vehicle.findUnique({ where: { id: booking.vehicleId } });
    if (!vehicle || vehicle.dailyRate == null) {
      throw AppError.badRequest("This booking's vehicle is no longer rentable");
    }
    // Stock re-check for the new window, excluding this booking itself.
    const overlap = await prisma.booking.count({
      where: {
        vehicleId: booking.vehicleId,
        id: { not: booking.id },
        status: { in: ["pending", "confirmed"] },
        startDate: { lte: newEnd },
        endDate: { gte: newStart },
      },
    });
    if (overlap >= vehicle.quantity) throw AppError.conflict("Out of stock for these dates");
    // Preserve any discounts already granted; recompute the base from the rate.
    const base =
      Number(vehicle.dailyRate) * rentalDays(newStart.toISOString(), newEnd.toISOString());
    const discounts = Number(booking.promoDiscount ?? 0) + Number(booking.loyaltyDiscount ?? 0);
    data.totalCost = Math.max(0, base - discounts);
  }

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

// user (+ id images) + vehicle so the staff check-in screen can verify the
// renter and show what they're handing over.
const CHECKIN_INCLUDE = {
  vehicle: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      idFrontUrl: true,
      idBackUrl: true,
    },
  },
} satisfies Prisma.BookingInclude;

// Single booking by id — staff (any) or the booking's own customer. Backs the
// QR check-in lookup: a scanned pass carries the full booking id.
export async function getOne(req: Request, res: Response): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: CHECKIN_INCLUDE,
  });
  if (!booking) throw AppError.notFound("Booking not found");
  if (!STAFF_TYPES.has(req.user!.accountType) && booking.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }
  res.json({ data: booking });
}

// Handover / pickup. Staff scan the pass (or confirm by code) and hand the
// vehicle over: we stamp checkedInAt + who did it, and optionally mark a
// cash booking paid at the same moment. Status stays "confirmed" for the
// active rental — completion happens on return via update → "completed".
export async function checkIn(req: Request, res: Response): Promise<void> {
  if (!STAFF_TYPES.has(req.user!.accountType)) throw AppError.forbidden();
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");
  if (booking.status === "cancelled") {
    throw AppError.conflict("Cannot check in a cancelled booking");
  }
  if (booking.status === "pending") {
    throw AppError.conflict("Approve this booking before checking it in");
  }
  if (booking.checkedInAt) {
    throw AppError.conflict("This booking was already checked in");
  }

  const collectPayment = req.body?.collectPayment === true;
  const data: Prisma.BookingUpdateInput = {
    checkedInAt: new Date(),
    checkedInById: req.user!.userId,
  };
  if (collectPayment && booking.paymentStatus !== "paid") {
    data.paymentStatus = "paid";
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data,
    include: CHECKIN_INCLUDE,
  });
  emitDomainEvent("booking.updated", booking.id, booking.userId, { checkedIn: true });
  await notifyUser(booking.userId, `booking-checkedin-${booking.id}`, {
    type: "booking_checked_in",
    title: "Vehicle handed over",
    body: "Enjoy the ride — your rental has started.",
    data: { bookingId: booking.id, url: `/rent/booking/${booking.id}` },
  });
  res.json({ data: updated });
}

// Customer-facing copy for each pipeline stage. The customer sees the same
// milestones staff tick off, so the chip row and the push can never tell two
// different stories about where the booking is.
const BOOKING_STAGE_NOTICE: Record<BookingStage, { title: string; body: string }> = {
  requested: { title: "Booking received", body: "We're reviewing your booking now." },
  approved: { title: "Booking confirmed", body: "Your booking has been approved. See you soon." },
  customer_confirmed: {
    title: "Booking locked in",
    body: "Thanks for confirming — we're getting your ride ready.",
  },
  payment_collected: { title: "Payment received", body: "Your booking is fully paid. Thank you." },
  handed_over: { title: "Vehicle handed over", body: "Enjoy the ride — your rental has started." },
  returned: { title: "Rental complete", body: "Thanks for riding with us. Your points are in." },
};

// POST /api/bookings/:id/stage — staff move the booking one step down the
// fulfilment pipeline. The legacy status/paymentStatus/checkedInAt columns stay
// authoritative for everything already built, so each stage writes them in the
// SAME update: the stage is a label over existing state, never a second truth.
export async function advanceStage(req: Request, res: Response): Promise<void> {
  if (!STAFF_TYPES.has(req.user!.accountType)) throw AppError.forbidden();
  const input = advanceStageSchema.parse(req.body);
  if (stageIndex(BOOKING_STAGES, input.stage) < 0) {
    throw AppError.badRequest(`"${input.stage}" is not a booking stage`);
  }
  const stage = input.stage as BookingStage;

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");
  // A closed booking is off the pipeline. Without this, a cancelled+refunded
  // booking could be walked forward again — flipping "refunded" back to "paid",
  // stamping a handover, and re-firing the loyalty payout on a dead rental.
  // Mirrors the same refusal in checkIn().
  if (booking.status === "cancelled") {
    throw AppError.conflict("This booking was cancelled — it can no longer move down the pipeline");
  }
  if (booking.status === "completed") {
    throw AppError.conflict("This booking is already complete");
  }
  if (!canAdvance(BOOKING_STAGES, booking.stage, stage)) {
    throw AppError.conflict(
      `Cannot move this booking from "${booking.stage}" to "${stage}" — the pipeline moves one step at a time. Add a note instead.`,
    );
  }

  const data: Prisma.BookingUpdateInput = { stage };
  if (stage === "approved" && booking.status === "pending") data.status = "confirmed";
  if (stage === "payment_collected") data.paymentStatus = "paid";
  if (stage === "handed_over" && !booking.checkedInAt) {
    data.checkedInAt = new Date();
    data.checkedInById = req.user!.userId;
  }
  if (stage === "returned") data.status = "completed";

  // Compare-and-set on the stage we read. Two staff advancing the same booking
  // at once would otherwise BOTH pass the payout guard above (read/read/write/
  // write) and each mint loyalty points. The loser matches 0 rows and 409s.
  // Interactive tx so the timeline row is only written when the claim wins —
  // a batch would record an event for a move that never happened.
  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.booking.updateMany({
      where: { id: booking.id, stage: booking.stage },
      data,
    });
    if (claimed.count !== 1) return null;
    await tx.stageEvent.create({
      data: {
        entityType: "booking",
        entityId: booking.id,
        stage,
        note: input.note ?? null,
        actorId: req.user!.userId,
      },
    });
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
  });
  if (!updated) {
    throw AppError.conflict("Someone else just moved this booking — reopen it to see where it is");
  }

  // Loyalty + referral payout. onBookingCompleted() is NOT idempotent — it mints
  // points unconditionally — so exactly one caller must ever reach it per
  // booking. Three things guarantee that, which is why there is no status check
  // here (TypeScript proves it would be dead code):
  //   1. the terminal guard above rejects an already-completed booking outright;
  //   2. canAdvance permits only "handed_over" → "returned", so this line is
  //      reachable once per booking;
  //   3. the compare-and-set update means concurrent callers can't both win.
  if (stage === "returned") {
    await onBookingCompleted(updated.id, updated.userId, Number(updated.totalCost));
  }

  emitDomainEvent("booking.updated", booking.id, booking.userId, { stage });
  const notice = BOOKING_STAGE_NOTICE[stage];
  await notifyUser(booking.userId, `booking-stage-${stage}-${booking.id}`, {
    type: "booking_stage_changed",
    title: notice.title,
    body: notice.body,
    data: { bookingId: booking.id, stage, url: `/rent/booking/${booking.id}` },
  });
  res.json({ data: updated });
}

// GET /api/bookings/:id/stage-events — pipeline history, newest first. Staff or
// the booking's own customer, matching getOne's visibility rule.
export async function stageEvents(req: Request, res: Response): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    select: { id: true, userId: true },
  });
  if (!booking) throw AppError.notFound("Booking not found");
  const isStaff = STAFF_TYPES.has(req.user!.accountType);
  if (!isStaff && booking.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }
  const events = await prisma.stageEvent.findMany({
    where: { entityType: "booking", entityId: booking.id },
    orderBy: { createdAt: "desc" },
  });
  // Staff notes are internal ("ID looks doctored, verify before handover") and
  // the composer doesn't warn otherwise — so the customer gets the timeline
  // without the note or the actor.
  res.json({
    data: isStaff ? events : events.map(({ note: _n, actorId: _a, ...rest }) => rest),
  });
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
