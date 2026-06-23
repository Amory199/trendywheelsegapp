import { LOYALTY_TIER_THRESHOLDS } from "@trendywheels/types";

import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { notifyUser } from "../../utils/notify.js";

// Tier ladder based on LIFETIME EARNED points (not current balance), so
// redeeming points can never demote anyone — once a tier is reached it's kept.
// Thresholds live in @trendywheels/types (single source). At 10 pts per EGP 100
// spent: silver ≈ EGP 10k, gold ≈ EGP 50k, platinum ≈ EGP 150k lifetime spend.
const TIER_THRESHOLDS = [
  { tier: "platinum", minEarned: LOYALTY_TIER_THRESHOLDS.platinum },
  { tier: "gold", minEarned: LOYALTY_TIER_THRESHOLDS.gold },
  { tier: "silver", minEarned: LOYALTY_TIER_THRESHOLDS.silver },
  { tier: "bronze", minEarned: LOYALTY_TIER_THRESHOLDS.bronze },
] as const;

type Tier = (typeof TIER_THRESHOLDS)[number]["tier"];

const TIER_RANK: Record<Tier, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

function tierForEarned(lifetimeEarned: number): Tier {
  return (TIER_THRESHOLDS.find((t) => lifetimeEarned >= t.minEarned) ?? TIER_THRESHOLDS[3]).tier;
}

/**
 * Recompute a user's loyalty tier from lifetime earned points and promote if
 * they crossed a threshold. Never demotes. Sends a celebratory push on
 * upgrade. Best-effort: callers fire-and-forget after the points transaction
 * has committed, so a failure here can't roll back an earn.
 */
export async function maybePromoteLoyaltyTier(userId: string): Promise<void> {
  try {
    const [user, earnedAgg] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { loyaltyTier: true },
      }),
      prisma.loyaltyTransaction.aggregate({
        where: { userId, type: { in: ["earned", "manual_adjust"] }, points: { gt: 0 } },
        _sum: { points: true },
      }),
    ]);
    if (!user) return;

    const lifetimeEarned = earnedAgg._sum.points ?? 0;
    const next = tierForEarned(lifetimeEarned);
    if (TIER_RANK[next] <= TIER_RANK[user.loyaltyTier as Tier]) return;

    await prisma.user.update({ where: { id: userId }, data: { loyaltyTier: next } });
    await notifyUser(userId, `loyalty-tier-${userId}-${next}`, {
      type: "loyalty_tier_upgraded",
      title: `You're ${next.charAt(0).toUpperCase()}${next.slice(1)} now! 🎉`,
      body: `Congratulations — your loyalty just unlocked ${next} tier rewards.`,
      data: { tier: next, lifetimeEarned },
    });
  } catch (err) {
    logger.warn({ err, userId }, "loyalty tier promotion failed (non-fatal)");
  }
}
