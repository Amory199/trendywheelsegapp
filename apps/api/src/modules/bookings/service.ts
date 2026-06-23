// Bookings — service layer. Holds pure data-access functions that don't
// depend on Express. Controllers parse req/res, then call into here.
// Workers (booking-reminder, completion-sweeper, etc.) can call the same
// functions without going through the HTTP layer.

import { LOYALTY } from "@trendywheels/types";

import { prisma } from "../../config/database.js";
import { maybePromoteLoyaltyTier } from "../customer-features/loyalty-tiers.js";

// Loyalty/referral economics live in @trendywheels/types so the API and the
// customer app share one source of truth. Awarded points = floor(totalCost/10),
// matching the brand promise "10 points for every EGP 100 spent on rentals".
const LOYALTY_POINTS_PER_EGP_100 = LOYALTY.POINTS_PER_EGP_100;

// First-completed-booking referral bonus (both referrer and referee).
const REFERRAL_BONUS_POINTS = LOYALTY.REFERRAL_BONUS_POINTS;

/**
 * Booking completion hook — mints loyalty + referral payouts. Idempotent:
 * if called twice for the same booking the loyalty earn line is unique
 * by `reason = "Completed booking <id>"` and the referral guard checks
 * `completedAt === null`.
 */
export async function onBookingCompleted(
  bookingId: string,
  userId: string,
  totalCost: number,
): Promise<void> {
  // 1. Award loyalty points (10 pts per EGP 100, rounded down).
  const earnedPts = Math.floor(totalCost / LOYALTY_POINTS_PER_EGP_100);
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

  // 2. Referral payout: if this user was referred and this is their FIRST
  //    completed booking, both sides earn the bonus once.
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
            points: REFERRAL_BONUS_POINTS,
            type: "earned",
            reason: "Referral bonus",
          },
        }),
        prisma.loyaltyTransaction.create({
          data: {
            userId: referral.refereeId,
            points: REFERRAL_BONUS_POINTS,
            type: "earned",
            reason: "Welcome bonus (referred)",
          },
        }),
        prisma.user.update({
          where: { id: referral.referrerId },
          data: { loyaltyPoints: { increment: REFERRAL_BONUS_POINTS } },
        }),
        prisma.user.update({
          where: { id: referral.refereeId },
          data: { loyaltyPoints: { increment: REFERRAL_BONUS_POINTS } },
        }),
      ]);
      // Referrer also earned points — they may have crossed a tier too.
      await maybePromoteLoyaltyTier(referral.referrerId);
    }
  }

  // 3. Tier check AFTER all earns committed. Never demotes; pushes a
  //    celebration notification when a threshold is crossed.
  await maybePromoteLoyaltyTier(userId);
}
