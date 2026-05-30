"use client";

import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import type { JSX } from "react";

const PATHS = [
  {
    href: "/sell/create",
    label: "Sell my cart outright",
    sub: "List your golf cart for sale. We handle the buyers.",
    image: "https://picsum.photos/seed/sell-outright/1200/700",
  },
  {
    href: "/sell/list-for-rent",
    label: "List my cart for rent",
    sub: "Earn passive income — we manage the rentals end-to-end.",
    image: "https://picsum.photos/seed/sell-list-rent/1200/700",
  },
  {
    href: "/sell/trade-in",
    label: "Trade in for a new one",
    sub: "Get a quote on yours, apply credit toward a fresh model.",
    image: "https://picsum.photos/seed/sell-trade-in/1200/700",
  },
] as const;

export default function SellPage(): JSX.Element {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "Anton, sans-serif",
            fontSize: "clamp(36px, 6vw, 56px)",
            margin: 0,
            letterSpacing: 0.4,
            lineHeight: 1,
          }}
        >
          Got a cart?
        </h1>
        <div style={{ marginTop: 10, fontSize: 15, opacity: 0.65 }}>
          Three ways to turn it into something else.
        </div>
      </div>
      <div style={{ display: "grid", gap: 18 }}>
        {PATHS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="tw-press"
            style={{
              display: "block",
              position: "relative",
              borderRadius: 22,
              overflow: "hidden",
              minHeight: 220,
              textDecoration: "none",
              color: "#fff",
              backgroundImage: `url("${p.image}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(120deg, rgba(2,1,31,0.85) 0%, rgba(2,1,31,0.35) 60%, rgba(2,1,31,0) 100%)",
              }}
            />
            <div
              style={{
                position: "relative",
                padding: "28px 32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                minHeight: 220,
              }}
            >
              <div
                style={{
                  fontFamily: "Anton, sans-serif",
                  fontSize: "clamp(28px, 4.5vw, 38px)",
                  letterSpacing: 0.3,
                  lineHeight: 1.05,
                }}
              >
                {p.label}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, maxWidth: 540 }}>
                {p.sub}
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  color: colors.brand.ecoLimelight,
                }}
              >
                START →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
