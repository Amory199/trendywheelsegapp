"use client";

import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";

const TIER_GRADIENTS: Record<string, string> = {
  bronze: "linear-gradient(135deg, #CD7F32, #8B5A2B)",
  silver: "linear-gradient(135deg, #9E9E9E, #5E5E5E)",
  gold: "linear-gradient(135deg, #F5B800, #D19500)",
  platinum: `linear-gradient(135deg, ${colors.brand.poolBlue}, ${colors.brand.friendlyBlue})`,
};

interface Props {
  name: string;
  phone: string;
  tier: string;
}

export function HeroStrip({ name, phone, tier }: Props): JSX.Element {
  const initials = (name || "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      href="/profile/edit"
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        style={{
          background: TIER_GRADIENTS[tier] ?? TIER_GRADIENTS.bronze,
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
