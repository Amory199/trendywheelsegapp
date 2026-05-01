"use client";

import { TWLogoLockup } from "@trendywheels/ui-brand/web";
import { colors, twPalette } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useEffect } from "react";

import { useAuth } from "./auth-store";

type NavGroup = {
  label: string;
  items: Array<{
    href: string;
    label: string;
    icon: keyof typeof NAV_ICONS;
    badge?: string;
  }>;
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: "trend" }],
  },
  {
    label: "Operations",
    items: [
      { href: "/vehicles", label: "Vehicles", icon: "car" },
      { href: "/bookings", label: "Bookings", icon: "calendar" },
      { href: "/sales", label: "Sales", icon: "tag" },
      { href: "/repairs", label: "Repairs", icon: "wrench" },
      { href: "/alerts", label: "Alerts", icon: "alert" },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/customers", label: "CRM", icon: "users" },
      { href: "/users", label: "All users", icon: "user" },
      { href: "/tickets", label: "Support tickets", icon: "ticket" },
      { href: "/messages", label: "Messages", icon: "chat" },
      { href: "/notifications", label: "Notifications", icon: "bell" },
    ],
  },
  {
    label: "Power tools",
    items: [
      { href: "/ops", label: "Operations", icon: "bolt" },
      { href: "/promo-codes", label: "Promo codes", icon: "tag" },
      { href: "/pricing-rules", label: "Pricing rules", icon: "trend" },
      { href: "/broadcasts", label: "Broadcasts", icon: "bell" },
      { href: "/templates", label: "Templates", icon: "book" },
      { href: "/audit-log", label: "Audit log", icon: "shield" },
      { href: "/feature-flags", label: "Feature flags", icon: "flag" },
      { href: "/sales-targets", label: "Sales targets", icon: "trend" },
      { href: "/business", label: "Business config", icon: "gear" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/kb", label: "Knowledge base", icon: "book" },
      { href: "/settings", label: "Settings", icon: "gear" },
    ],
  },
];

// Minimal stroke-icon set, mirroring the mockup's TWIcon library.
const NAV_ICONS = {
  trend: <path d="M3 17l4-4 4 4 7-7M15 6h6v6" strokeLinecap="round" strokeLinejoin="round" />,
  car: (
    <path
      d="M3 12l2-5h14l2 5v5a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a1 1 0 0 1-1-1v-5zM6 12h12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
    </>
  ),
  tag: <path d="M20 13l-7 7-9-9V4h7l9 9zM8 8h.01" strokeLinecap="round" strokeLinejoin="round" />,
  wrench: <path d="M14 5l5 5-7 7-9-9 3-3 4 4 4-4z" strokeLinecap="round" strokeLinejoin="round" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 1v4M12 19v4M4 12H1M23 12h-3M6 6l-2.5-2.5M20.5 20.5L18 18M6 18l-2.5 2.5M20.5 3.5L18 6"
        strokeLinecap="round"
      />
    </>
  ),
  bell: (
    <path
      d="M6 8a6 6 0 1 1 12 0v5l2 3H4l2-3V8zM10 19a2 2 0 0 0 4 0"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.5-4.5" strokeLinecap="round" />
    </>
  ),
  chevR: <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
  alert: (
    <>
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
      <path
        d="M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </>
  ),
  ticket: (
    <path
      d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9zM13 7v10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  chat: (
    <path
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  book: (
    <path
      d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  bolt: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" strokeLinecap="round" strokeLinejoin="round" />,
  shield: (
    <path
      d="M12 2l8 4v6c0 5-4 9-8 10-4-1-8-5-8-10V6l8-4z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  flag: (
    <>
      <path d="M4 21V4M4 4h12l-2 4 2 4H4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
} as const;

function TWIcon({
  name,
  size = 18,
  color = "currentColor",
  stroke = 1.8,
}: {
  name: keyof typeof NAV_ICONS;
  size?: number;
  color?: string;
  stroke?: number;
}): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
    >
      {NAV_ICONS[name]}
    </svg>
  );
}

function humanCrumb(segment: string): string {
  if (!segment) return "Home";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Shell({ children }: { children: React.ReactNode }): JSX.Element | null {
  const router = useRouter();
  const path = usePathname();
  const { user, initialized, hydrate, logout } = useAuth();
  const palette = twPalette(false);

  useEffect(() => {
    if (!initialized) void hydrate();
  }, [initialized, hydrate]);

  useEffect(() => {
    if (initialized && !user && path !== "/login") router.replace("/login");
  }, [initialized, user, path, router]);

  if (path === "/login") return <>{children}</>;
  if (!initialized) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          color: palette.muted,
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }
  if (!user) return null;

  const crumbs = [
    "Home",
    ...(path === "/" ? ["Dashboard"] : path.split("/").filter(Boolean).map(humanCrumb)),
  ];
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "OS";

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: palette.bg,
        color: palette.text,
      }}
    >
      {/* ─── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          background: palette.card,
          borderRight: `1px solid ${palette.border}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "22px 20px 18px" }}>
          <TWLogoLockup size={28} color={palette.text} />
        </div>
        <div
          style={{ padding: "0 12px 12px", flex: 1, overflowY: "auto" }}
          className="tw-scrollbar-none"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ marginTop: 14 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: palette.muted,
                  padding: "0 14px 6px",
                  opacity: 0.7,
                }}
              >
                {group.label}
              </div>
              {group.items.map((n) => {
                const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="tw-press"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "9px 14px",
                      margin: "1px 0",
                      textDecoration: "none",
                      borderRadius: 10,
                      background: active ? "rgba(43,15,248,0.08)" : "transparent",
                      color: active ? colors.brand.friendlyBlue : palette.muted,
                      fontWeight: active ? 700 : 500,
                      fontSize: 13,
                      position: "relative",
                    }}
                  >
                    {active && (
                      <div
                        style={{
                          position: "absolute",
                          left: -12,
                          top: 8,
                          bottom: 8,
                          width: 3,
                          borderRadius: 2,
                          background: colors.brand.trendyPink,
                        }}
                      />
                    )}
                    <TWIcon name={n.icon} size={17} stroke={active ? 2.2 : 1.8} />
                    <span style={{ flex: 1 }}>{n.label}</span>
                    {n.badge ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 10,
                          background: active ? colors.brand.trendyPink : palette.cardAlt,
                          color: active ? "#fff" : palette.muted,
                        }}
                      >
                        {n.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        <div
          style={{
            padding: 14,
            borderTop: `1px solid ${palette.hairline}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              background: "linear-gradient(135deg,#2B0FF8,#FF0065)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: palette.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name}
            </div>
            <div style={{ fontSize: 10.5, color: palette.muted }}>Admin</div>
          </div>
          <button
            onClick={() => {
              void logout();
              router.replace("/login");
            }}
            className="tw-press"
            aria-label="Sign out"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "none",
              background: palette.cardAlt,
              color: palette.muted,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ↗
          </button>
        </div>
      </aside>

      {/* ─── Main ────────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <header
          style={{
            height: 60,
            padding: "0 24px",
            borderBottom: `1px solid ${palette.border}`,
            background: palette.card,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: palette.muted,
            }}
          >
            {crumbs.map((c, i) => (
              <React.Fragment key={`${c}-${i}`}>
                <span
                  style={{
                    color: i === crumbs.length - 1 ? palette.text : palette.muted,
                    fontWeight: i === crumbs.length - 1 ? 700 : 500,
                  }}
                >
                  {c}
                </span>
                {i < crumbs.length - 1 ? (
                  <TWIcon name="chevR" size={12} color={palette.muted} />
                ) : null}
              </React.Fragment>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              width: 280,
              height: 36,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 12px",
              borderRadius: 10,
              background: palette.cardAlt,
              border: `1px solid ${palette.border}`,
              color: palette.muted,
              fontSize: 13,
            }}
          >
            <TWIcon name="search" size={15} />
            <span>Search vehicles, users, bookings…</span>
            <div style={{ flex: 1 }} />
            <kbd
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 5,
                background: palette.card,
                border: `1px solid ${palette.border}`,
                fontFamily: "ui-monospace,monospace",
              }}
            >
              ⌘K
            </kbd>
          </div>
          <button
            className="tw-press"
            aria-label="Notifications"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "none",
              background: palette.cardAlt,
              color: palette.text,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <TWIcon name="bell" size={17} />
            <span
              style={{
                position: "absolute",
                top: 6,
                right: 7,
                width: 8,
                height: 8,
                borderRadius: 4,
                background: colors.brand.trendyPink,
                boxShadow: `0 0 0 2px ${palette.cardAlt}`,
              }}
            />
          </button>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
      </main>
    </div>
  );
}
