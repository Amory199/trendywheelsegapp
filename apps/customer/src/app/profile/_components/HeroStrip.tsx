"use client";

import type { LoyaltyTier } from "@trendywheels/types";
import { initialsOf, TIER_GRADIENTS } from "@trendywheels/ui-tokens";
import Link from "next/link";

interface Props {
  name: string;
  phone: string;
  tier: LoyaltyTier | string;
}

export function HeroStrip({ name, phone, tier }: Props): JSX.Element {
  const gradient = TIER_GRADIENTS[tier as LoyaltyTier] ?? TIER_GRADIENTS.bronze;
  const initials = initialsOf(name);

  return (
    <Link
      href="/profile/edit"
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        style={{
          background: gradient,
          color: "#fff",
          borderRadius: 20,
          padding: 24,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            background: "rgba(255,255,255,0.22)",
            border: "2px solid rgba(255,255,255,0.65)",
            display: "grid",
            placeItems: "center",
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 30,
            letterSpacing: 1,
          }}
        >
          {initials || "TW"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "Anton, Impact, sans-serif",
              fontSize: 26,
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name || "Welcome"}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{phone}</div>
          <div
            style={{
              marginTop: 8,
              display: "inline-block",
              background: "rgba(255,255,255,0.22)",
              borderRadius: 999,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {tier} tier
          </div>
        </div>
        <div style={{ fontSize: 20, opacity: 0.85 }}>›</div>
      </div>
    </Link>
  );
}
