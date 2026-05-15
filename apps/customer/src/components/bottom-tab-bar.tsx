"use client";

import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

// Tabs for the customer surface. 5 max — anything more crowds on small
// phones. "Sell" lives inside the Home action-chip grid + drawer rather
// than the bottom bar.
const TABS: Array<{ href: string; label: string; match: string; icon: React.JSX.Element }> = [
  {
    href: "/",
    label: "Home",
    match: "/",
    icon: (
      <path
        d="M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    ),
  },
  {
    href: "/buy",
    label: "Buy",
    match: "/buy",
    icon: (
      <path
        d="M6 6h15l-1.5 9h-12L6 6zM6 6L5 3H2M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    ),
  },
  {
    href: "/rent",
    label: "Rent",
    match: "/rent",
    icon: (
      <path
        d="M3 13l2-6h14l2 6M5 13h14v5a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a1 1 0 0 1-1-1v-5z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    ),
  },
  {
    href: "/service",
    label: "Service",
    match: "/service",
    icon: <path d="M14 5l5 5-7 7-9-9 3-3 4 4 4-4z" strokeLinejoin="round" strokeLinecap="round" />,
  },
  {
    href: "/profile",
    label: "Profile",
    match: "/profile",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
      </>
    ),
  },
];

export function BottomTabBar(): React.JSX.Element {
  const path = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="tw-bottom-tabs tw-safe-bottom"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderTop: "1px solid rgba(2,1,31,0.08)",
        display: "flex",
        justifyContent: "space-around",
        padding: "6px 6px 4px",
      }}
    >
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.match);
        return (
          <Link
            key={t.href}
            href={t.href}
            className="tw-press"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              minWidth: 56,
              minHeight: 52,
              padding: "4px 8px",
              borderRadius: 12,
              color: active ? colors.brand.trendyPink : colors.brand.trustWorth,
              textDecoration: "none",
              fontSize: 10,
              fontWeight: active ? 700 : 500,
              letterSpacing: 0.2,
              opacity: active ? 1 : 0.7,
            }}
          >
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2.2 : 1.8}
              aria-hidden
            >
              {t.icon}
            </svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
