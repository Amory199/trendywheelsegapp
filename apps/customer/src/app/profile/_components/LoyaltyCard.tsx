"use client";

import type { LoyaltyTier } from "@trendywheels/types";
import { colors, nextTier, pointsToNext, tierProgress } from "@trendywheels/ui-tokens";

// Web-only sweep palette for the conic ring around the loyalty star. Richer
// than the flat TIER_COLORS pair from ui-tokens (which is meant for linear
// hero gradients); kept here because conic-gradient is web-specific.
const TIER_RING: Record<LoyaltyTier, string> = {
  bronze: "conic-gradient(#CD7F32, #F5B800, #CD7F32)",
  silver: "conic-gradient(#E3E3E3, #BFBFBF, #9E9E9E, #E3E3E3)",
  gold: "conic-gradient(#F5B800, #FFD96B, #D19500, #F5B800)",
  platinum: `conic-gradient(${colors.brand.poolBlue}, #FFFFFF, ${colors.brand.friendlyBlue}, ${colors.brand.poolBlue})`,
};

export function LoyaltyCard({
  tier,
  points,
}: {
  tier: LoyaltyTier | string;
  points: number;
}): JSX.Element {
  const t = (tier as LoyaltyTier) in TIER_RING ? (tier as LoyaltyTier) : "bronze";
  const next = nextTier(t);
  const progress = tierProgress(t, points);
  const remaining = pointsToNext(t, points);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ECECF1",
        borderRadius: 16,
        padding: 18,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          background: TIER_RING[t] ?? TIER_RING.bronze,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 24,
          }}
        >
          ★
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 30,
            color: "#1A1933",
            lineHeight: 1,
          }}
        >
          {points.toLocaleString()}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: "#6B6A85",
            marginTop: 4,
          }}
        >
          Loyalty points
        </div>
        <div
          style={{
            marginTop: 10,
            height: 8,
            borderRadius: 4,
            background: "#ECECF1",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              background: "#F5B800",
              borderRadius: 4,
              transition: "width 0.7s ease-out",
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#6B6A85", marginTop: 6 }}>
          {next ? `${remaining.toLocaleString()} pts to ${next}` : "Top tier — maxed out 🏆"}
        </div>
      </div>
    </div>
  );
}
