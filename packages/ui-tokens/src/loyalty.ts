// Single source of truth for loyalty-tier UI tokens.
//
// Before this module the tier thresholds (bronze → 1000, silver → 5000, gold →
// 15000) lived inline in apps/mobile/components/profile/LoyaltyCard.tsx AND
// apps/customer/src/app/profile/_components/LoyaltyCard.tsx — and the tier
// gradients were duplicated across admin, support, customer, and mobile. Five
// places to change if the loyalty programme shifts. Now: one.
//
// Importable in both React Native (mobile) and React DOM (web) — values are
// plain strings; no platform APIs touched.

import type { LoyaltyTier } from "@trendywheels/types";

/**
 * Next-tier thresholds. `at` is the *cumulative* point total required to
 * reach the next tier (not the delta from the current tier). `next: null`
 * marks the top tier.
 */
export const TIER_NEXT: Record<LoyaltyTier, { next: LoyaltyTier | null; at: number }> = {
  bronze: { next: "silver", at: 1000 },
  silver: { next: "gold", at: 5000 },
  gold: { next: "platinum", at: 15000 },
  platinum: { next: null, at: 0 },
};

/**
 * Per-tier gradient stops [start, end] suitable for LinearGradient (mobile) or
 * `linear-gradient(135deg, start, end)` (web). Platinum reuses the brand pool/
 * friendly-blue pair so it visually escalates from the warmer bronze/silver/
 * gold sequence.
 */
export const TIER_COLORS: Record<LoyaltyTier, readonly [string, string]> = {
  bronze: ["#CD7F32", "#8B5A2B"],
  silver: ["#9E9E9E", "#5E5E5E"],
  gold: ["#F5B800", "#D19500"],
  platinum: ["#1ACFFF", "#2B0FF8"],
};

/**
 * Web-only convenience: pre-baked `linear-gradient(...)` strings keyed by tier.
 * Saves the per-component template-literal recomputation.
 */
export const TIER_GRADIENTS: Record<LoyaltyTier, string> = {
  bronze: `linear-gradient(135deg, ${TIER_COLORS.bronze[0]}, ${TIER_COLORS.bronze[1]})`,
  silver: `linear-gradient(135deg, ${TIER_COLORS.silver[0]}, ${TIER_COLORS.silver[1]})`,
  gold: `linear-gradient(135deg, ${TIER_COLORS.gold[0]}, ${TIER_COLORS.gold[1]})`,
  platinum: `linear-gradient(135deg, ${TIER_COLORS.platinum[0]}, ${TIER_COLORS.platinum[1]})`,
};

/** Returns the tier above `current`, or `null` at the top tier. */
export function nextTier(current: LoyaltyTier): LoyaltyTier | null {
  return TIER_NEXT[current].next;
}

/**
 * 0–1 progress toward the next tier given a points total. Returns 1 for the
 * top tier (nothing further to climb).
 */
export function tierProgress(current: LoyaltyTier, points: number): number {
  const meta = TIER_NEXT[current];
  if (!meta.next) return 1;
  return Math.min(1, points / meta.at);
}

/**
 * Points still needed to hit the next tier. Returns 0 at the top.
 */
export function pointsToNext(current: LoyaltyTier, points: number): number {
  const meta = TIER_NEXT[current];
  if (!meta.next) return 0;
  return Math.max(0, meta.at - points);
}
