"use client";

import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import type { JSX } from "react";

type Tone = "blue" | "pink" | "amber" | "pool" | "purple";

const TONE_MAP: Record<Tone, string> = {
  blue: colors.brand.friendlyBlue,
  pink: colors.brand.trendyPink,
  amber: "#F5B800",
  pool: colors.brand.poolBlue,
  purple: "#7A4DFF",
};

const ICON_MAP: Record<string, string> = {
  bookings: "📅",
  listings: "🏷️",
  repairs: "🔧",
  messages: "💬",
};

interface Props {
  href: string;
  title: string;
  subtitle: string;
  tone: Tone;
  iconKey: keyof typeof ICON_MAP;
  badge?: string | number;
}

export function ActivityCard({ href, title, subtitle, tone, iconKey, badge }: Props): JSX.Element {
  const accent = TONE_MAP[tone];
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 16,
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.06)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "";
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: `${accent}22`,
            display: "grid",
            placeItems: "center",
            fontSize: 26,
            flexShrink: 0,
          }}
        >
          {ICON_MAP[iconKey] ?? "•"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#1A1933",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </div>
            {badge ? (
              <span
                style={{
                  background: accent,
                  color: "#fff",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.4,
                }}
              >
                {badge}
              </span>
            ) : null}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#6B6A85",
              marginTop: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subtitle}
          </div>
        </div>
        <div style={{ fontSize: 18, color: "#6B6A85" }}>›</div>
      </div>
    </Link>
  );
}
