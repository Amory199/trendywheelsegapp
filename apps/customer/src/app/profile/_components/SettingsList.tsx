"use client";

import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import type { JSX } from "react";

interface Row {
  icon: string;
  label: string;
  href: string;
}

const ROWS: Row[] = [
  { icon: "✏️", label: "Edit profile", href: "/profile/edit" },
  { icon: "🔔", label: "Notifications", href: "/account/notifications" },
  { icon: "🌐", label: "Language", href: "/account/language" },
  { icon: "🔒", label: "Privacy", href: "/account/privacy" },
  { icon: "❓", label: "Help & support", href: "/messages" },
];

export function SettingsList({
  appVersion,
  onSignOut,
}: {
  appVersion: string;
  onSignOut: () => void;
}): JSX.Element {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ECECF1",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {ROWS.map((r, i) => (
        <Link
          key={r.label}
          href={r.href}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            padding: "14px 16px",
            borderBottom: i < ROWS.length - 1 ? "1px solid #ECECF1" : "none",
            gap: 12,
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: `${colors.brand.friendlyBlue}18`,
              display: "grid",
              placeItems: "center",
              fontSize: 18,
            }}
          >
            {r.icon}
          </span>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: "#1A1933" }}>
            {r.label}
          </span>
          <span style={{ color: "#6B6A85" }}>›</span>
        </Link>
      ))}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #ECECF1",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span style={{ flex: 1, color: "#6B6A85", fontSize: 12 }}>TrendyWheels v{appVersion}</span>
        <Link
          href="/account/delete"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: colors.brand.ultraRed ?? "#D43F3F",
            textDecoration: "none",
          }}
        >
          Delete account
        </Link>
      </div>
      <button
        onClick={onSignOut}
        style={{
          width: "100%",
          padding: "14px 0",
          border: "none",
          borderTop: "1px solid #ECECF1",
          background: "#fff",
          color: colors.brand.trendyPink,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </div>
  );
}
