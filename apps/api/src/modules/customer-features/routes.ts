import { Router, type Router as RouterType } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/auth.js";
import { AppError } from "../../utils/errors.js";

const router: RouterType = Router();

// ─── Reviews (public read, authed write) ─────────────────────
router.get("/vehicles/:id/reviews", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { vehicleId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  const agg = await prisma.review.aggregate({
    where: { vehicleId: req.params.id },
    _avg: { rating: true },
    _count: { _all: true },
  });
  res.json({
    data: reviews,
    summary: {
      average: Number(agg._avg.rating ?? 0),
      count: agg._count._all,
    },
  });
});

router.use(authenticate);

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(8).default([]),
});

router.post("/bookings/:id/review", async (req, res) => {
  const body = reviewSchema.parse(req.body);
  const userId = req.user!.userId;
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { review: true },
  });
  if (!booking) throw AppError.notFound("Booking not found");
  if (booking.userId !== userId) throw AppError.forbidden("Not your booking");
  if (booking.status !== "completed") throw AppError.badRequest("Booking must be completed first");
  if (booking.review) throw AppError.conflict("Review already exists");

  const review = await prisma.$transaction(async (tx) => {
    const r = await tx.review.create({
      data: {
        userId,
        vehicleId: booking.vehicleId,
        bookingId: booking.id,
        rating: body.rating,
        title: body.title,
        body: body.body,
        photos: body.photos as never,
        editableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const agg = await tx.review.aggregate({
      where: { vehicleId: booking.vehicleId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await tx.vehicle.update({
      where: { id: booking.vehicleId },
      data: {
        averageRating: Number(agg._avg.rating ?? 0),
        reviewCount: agg._count._all,
      },
    });
    return r;
  });

  res.status(201).json({ data: review });
});

router.patch("/reviews/:id", async (req, res) => {
  const body = reviewSchema.partial().parse(req.body);
  const userId = req.user!.userId;
  const review = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!review) throw AppError.notFound("Review not found");
  if (review.userId !== userId) throw AppError.forbidden("Not your review");
  if (review.editableUntil < new Date()) throw AppError.badRequest("Review locked (24h elapsed)");

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { ...body, photos: body.photos !== undefined ? (body.photos as never) : undefined },
  });
  // Recompute vehicle aggregate
  const agg = await prisma.review.aggregate({
    where: { vehicleId: review.vehicleId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.vehicle.update({
    where: { id: review.vehicleId },
    data: { averageRating: Number(agg._avg.rating ?? 0), reviewCount: agg._count._all },
  });
  res.json({ data: updated });
});

router.delete("/reviews/:id", async (req, res) => {
  const userId = req.user!.userId;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  const isAdmin = me?.accountType === "admin" || me?.staffRole === "admin";
  const review = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!review) throw AppError.notFound("Review not found");
  if (!isAdmin && review.userId !== userId) throw AppError.forbidden("Not your review");
  if (!isAdmin && review.editableUntil < new Date()) throw AppError.badRequest("Review locked");
  await prisma.review.delete({ where: { id: review.id } });
  res.json({ success: true });
});

// ─── Referral codes ──────────────────────────────────────────
router.get("/referrals/me", async (req, res) => {
  const userId = req.user!.userId;
  let code = await prisma.referralCode.findUnique({ where: { userId } });
  if (!code) {
    code = await prisma.referralCode.create({
      data: { userId, code: generateReferralCode() },
    });
  }
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: "desc" },
    include: { referee: { select: { id: true, name: true } } },
  });
  res.json({ data: { code: code.code, usedCount: code.usedCount, referrals } });
});

router.post("/referrals/apply", async (req, res) => {
  const schema = z.object({ code: z.string().min(4).max(12) });
  const body = schema.parse(req.body);
  const userId = req.user!.userId;
  const existing = await prisma.referral.findUnique({ where: { refereeId: userId } });
  if (existing) throw AppError.badRequest("You've already used a referral code");
  const owner = await prisma.referralCode.findUnique({ where: { code: body.code.toUpperCase() } });
  if (!owner) throw AppError.notFound("Invalid code");
  if (owner.userId === userId) throw AppError.badRequest("Can't refer yourself");
  await prisma.$transaction([
    prisma.referral.create({
      data: { referrerId: owner.userId, refereeId: userId, codeUsed: body.code.toUpperCase() },
    }),
    prisma.referralCode.update({
      where: { id: owner.id },
      data: { usedCount: { increment: 1 } },
    }),
  ]);
  res.json({ success: true });
});

// ─── Promo codes (public validate, authed redeem) ────────────
router.post("/promo-codes/validate", async (req, res) => {
  const schema = z.object({
    code: z.string().min(2).max(40),
    totalAmount: z.number().nonnegative(),
  });
  const body = schema.parse(req.body);
  const promo = await prisma.promoCode.findUnique({ where: { code: body.code.toUpperCase() } });
  if (!promo || !promo.active) {
    res.json({ valid: false, reason: "Code not found or inactive" });
    return;
  }
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    res.json({ valid: false, reason: "Code expired" });
    return;
  }
  if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
    res.json({ valid: false, reason: "Code usage limit reached" });
    return;
  }
  const value = Number(promo.value);
  const discount =
    promo.kind === "percent"
      ? Math.round(body.totalAmount * (value / 100) * 100) / 100
      : Math.min(value, body.totalAmount);
  res.json({
    valid: true,
    code: promo.code,
    kind: promo.kind,
    discount,
    appliesTo: promo.appliesTo,
  });
});

// ─── Loyalty: my balance + history ───────────────────────────
router.get("/loyalty/me", async (req, res) => {
  const userId = req.user!.userId;
  const [user, txns] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true, loyaltyTier: true },
    }),
    prisma.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  res.json({
    data: {
      points: user?.loyaltyPoints ?? 0,
      tier: user?.loyaltyTier ?? "bronze",
      transactions: txns,
    },
  });
});

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export { router as customerFeaturesRoutes };
