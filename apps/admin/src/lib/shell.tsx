"use client";

import {
  MobileNavDrawer,
  TWCloseIcon,
  TWHamburgerIcon,
  TWLogoLockup,
} from "@trendywheels/ui-brand/web";
import { colors, initialsOf, twPalette } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useEffect, useState } from "react";
import type { JSX } from "react";

import { useAuth } from "./auth-store";
import { CommandPalette } from "./command-palette";

// Sidebar role-gating. Superadmins (accountType === "admin") see every item;
// staff are filtered by `allowedRoles` against their `staffRole`. Items with
// `allowedRoles` omitted are visible to all staff. An empty group (all items
// filtered out) collapses silently so the sidebar doesn't show dead headers.
type StaffRoleKey = "sales" | "support" | "inventory" | "mechanic" | "admin";

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof NAV_ICONS;
  badge?: string;
  /** Omit for "everyone with admin app access". */
  allowedRoles?: StaffRoleKey[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

// Canonical grouping post-reorg:
// Dashboard / Sales / Inventory / Customers / Comms / System.
// Power tools junk-drawer dissolved. URLs preserved (bookmarks survive).
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: "trend" }],
  },
  {
    label: "Sales",
    items: [
      { href: "/sales", label: "Sales listings", icon: "tag", allowedRoles: ["sales", "admin"] },
      { href: "/trade-ins", label: "Trade-ins", icon: "tag", allowedRoles: ["sales", "admin"] },
      {
        href: "/rentals",
        label: "Rental listings",
        icon: "calendar",
        allowedRoles: ["sales", "admin"],
      },
      { href: "/orders", label: "Orders", icon: "tag", allowedRoles: ["sales", "admin"] },
      {
        href: "/pricing-rules",
        label: "Pricing rules",
        icon: "trend",
        allowedRoles: ["sales", "admin"],
      },
      { href: "/promo-codes", label: "Promo codes", icon: "tag", allowedRoles: ["sales", "admin"] },
      {
        href: "/sales-targets",
        label: "Sales targets",
        icon: "trend",
        allowedRoles: ["sales", "admin"],
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        href: "/vehicles",
        label: "Vehicles",
        icon: "car",
        allowedRoles: ["sales", "inventory", "admin"],
      },
      {
        href: "/fleet",
        label: "Fleet status",
        icon: "trend",
        allowedRoles: ["inventory", "admin"],
      },
      { href: "/products", label: "Catalog", icon: "tag", allowedRoles: ["inventory", "admin"] },
      {
        href: "/maintenance",
        label: "Maintenance",
        icon: "wrench",
        allowedRoles: ["inventory", "mechanic", "admin"],
      },
      { href: "/repairs", label: "Repairs", icon: "wrench", allowedRoles: ["mechanic", "admin"] },
    ],
  },
  {
    label: "Customers",
    items: [
      {
        href: "/customers",
        label: "CRM",
        icon: "users",
        allowedRoles: ["sales", "support", "admin"],
      },
      // Also listed under System; duplicated here because "where do I manage
      // users?" is a Customers-section instinct, not a System one.
      { href: "/users", label: "All users", icon: "user", allowedRoles: ["admin"] },
      {
        href: "/bookings",
        label: "Bookings",
        icon: "calendar",
        allowedRoles: ["sales", "support", "admin"],
      },
      {
        href: "/transport",
        label: "Transport",
        icon: "trend",
        allowedRoles: ["inventory", "admin"],
      },
      {
        href: "/tickets",
        label: "Support tickets",
        icon: "ticket",
        allowedRoles: ["support", "admin"],
      },
      { href: "/messages", label: "Messages", icon: "chat", allowedRoles: ["support", "admin"] },
    ],
  },
  {
    label: "Comms",
    items: [
      { href: "/broadcasts", label: "Broadcasts", icon: "bell", allowedRoles: ["admin"] },
      { href: "/templates", label: "Templates", icon: "book", allowedRoles: ["support", "admin"] },
      { href: "/notifications", label: "Notifications", icon: "bell", allowedRoles: ["admin"] },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/kb", label: "Knowledge base", icon: "book", allowedRoles: ["support", "admin"] },
      { href: "/business", label: "Business config", icon: "gear", allowedRoles: ["admin"] },
      { href: "/settings", label: "Settings", icon: "gear", allowedRoles: ["admin"] },
      { href: "/users", label: "All users", icon: "user", allowedRoles: ["admin"] },
      { href: "/feature-flags", label: "Feature flags", icon: "flag", allowedRoles: ["admin"] },
      { href: "/privacy", label: "Privacy", icon: "shield", allowedRoles: ["admin"] },
      { href: "/ops", label: "Operations", icon: "bolt", allowedRoles: ["admin"] },
      { href: "/alerts", label: "Alerts", icon: "alert", allowedRoles: ["admin"] },
      { href: "/audit-log", label: "Audit log", icon: "shield", allowedRoles: ["admin"] },
      { href: "/logs", label: "Error logs", icon: "bolt", allowedRoles: ["admin"] },
    ],
  },
];

function visibleGroups(
  groups: NavGroup[],
  user: { accountType?: string | null; staffRole?: string | null } | null,
): NavGroup[] {
  // Superadmins (`accountType === "admin"`) see everything. If the user hasn't
  // hydrated yet, show every group so the sidebar doesn't flash empty.
  if (!user || user.accountType === "admin") return groups;
  const role = (user.staffRole ?? null) as StaffRoleKey | null;
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) => !item.allowedRoles || (role !== null && item.allowedRoles.includes(role)),
      ),
    }))
    .filter((g) => g.items.length > 0);
}

// Admin-only sections (config / users / system). Hiding them from the sidebar
// for non-admins isn't enough — a typed URL or a stale bookmark still loads the
// page. We hard-block those at the page level. Operational pages (sales,
// inventory, support work) stay reachable by any staff member; only the
// sensitive admin-exclusive pages are walled. Derived from the same matrix so
// the two never drift.
const ADMIN_ONLY_PREFIXES: string[] = NAV_GROUPS.flatMap((g) => g.items)
  .filter((it) => it.allowedRoles?.length === 1 && it.allowedRoles[0] === "admin")
  .map((it) => it.href);

function isAdminOnlyPath(path: string): boolean {
  return ADMIN_ONLY_PREFIXES.some((href) => path === href || path.startsWith(`${href}/`));
}

function isSuperadmin(user: { accountType?: string | null; staffRole?: string | null }): boolean {
  return user.accountType === "admin" || user.staffRole === "admin";
}

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
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global ⌘K / Ctrl+K opens the search palette from anywhere in the portal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const navGroups = React.useMemo(() => visibleGroups(NAV_GROUPS, user), [user]);

  useEffect(() => {
    setNavOpen(false);
  }, [path]);

  // Auto-reload on stale-chunk error after in-place deploys
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const msg = e.message || "";
      if (msg.includes("ChunkLoadError") || msg.includes("Loading chunk")) {
        if (!sessionStorage.getItem("tw-chunk-reloaded")) {
          sessionStorage.setItem("tw-chunk-reloaded", "1");
          window.location.reload();
        }
      }
    };
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);

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
          background: "#02011F",
        }}
      >
        <img
          src="/loading.webp"
          alt="TrendyWheels"
          style={{
            width: "min(60vw, 380px)",
            maxHeight: "70vh",
            objectFit: "contain",
          }}
        />
      </div>
    );
  }
  if (!user) return null;

  // Page-level guard: a non-admin staff member who lands on an admin-only page
  // (typed URL / bookmark / shared link) gets a clear block, not a half-rendered
  // page that 403s piecemeal. Superadmins always pass.
  if (isAdminOnlyPath(path) && !isSuperadmin(user)) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
          background: "#02011F",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 48 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>This area is for admins only</div>
        <div style={{ maxWidth: 420, opacity: 0.7, lineHeight: 1.5 }}>
          Your role doesn’t have access to this page. If you think this is a mistake, ask a
          superadmin to grant access.
        </div>
        <button
          onClick={() => router.replace("/")}
          style={{
            marginTop: 8,
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            background: "#FF0065",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const crumbs = [
    "Home",
    ...(path === "/" ? ["Dashboard"] : path.split("/").filter(Boolean).map(humanCrumb)),
  ];
  const initials = initialsOf(user.name) || "OS";

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: palette.bg,
        color: palette.text,
        position: "relative",
      }}
    >
      <div className="tw-ambient" aria-hidden>
        <div className="tw-ambient-grid" />
        <div className="tw-ambient-orb orb-blue" />
        <div className="tw-ambient-orb orb-pink" />
        <div className="tw-ambient-orb orb-pool" />
        <div className="tw-ambient-orb orb-lime" />
      </div>
      {/* ─── Sidebar (desktop only) ─────────────────────────────────── */}
      <aside
        className="tw-desktop-only"
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
          {navGroups.map((group) => (
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
                    className="tw-press tw-nav-item"
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
            className="tw-press tw-nav-item"
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
            padding: "0 clamp(12px, 3vw, 24px)",
            borderBottom: `1px solid ${palette.border}`,
            background: palette.card,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            className="tw-mobile-only tw-tap"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            style={{
              padding: 8,
              borderRadius: 10,
              border: "none",
              background: palette.cardAlt,
              color: palette.text,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <TWHamburgerIcon size={22} />
          </button>
          <div className="tw-mobile-only" style={{ display: "flex", alignItems: "center" }}>
            <TWLogoLockup size={22} color={palette.text} />
          </div>
          <div
            className="tw-desktop-only"
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
          <button
            className="tw-desktop-only tw-press tw-nav-item"
            onClick={() => setPaletteOpen(true)}
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
              cursor: "pointer",
              font: "inherit",
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
          </button>
          <button
            className="tw-press tw-nav-item"
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
        <div className="tw-page-enter" key={path} style={{ flex: 1, overflow: "auto" }}>
          {children}
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <MobileNavDrawer open={navOpen} onClose={() => setNavOpen(false)} side="left" width={300}>
        <div
          style={{
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: `1px solid ${palette.hairline}`,
          }}
        >
          <TWLogoLockup size={26} color={palette.text} />
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
            className="tw-tap"
            style={{
              padding: 8,
              borderRadius: 8,
              background: palette.cardAlt,
              border: "none",
              color: palette.text,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <TWCloseIcon size={20} />
          </button>
        </div>
        <div style={{ padding: "8px 12px 12px" }} className="tw-scrollbar-none">
          {navGroups.map((group) => (
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
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      margin: "1px 0",
                      textDecoration: "none",
                      borderRadius: 10,
                      background: active ? "rgba(43,15,248,0.08)" : "transparent",
                      color: active ? colors.brand.friendlyBlue : palette.text,
                      fontWeight: active ? 700 : 500,
                      fontSize: 14,
                    }}
                  >
                    <TWIcon name={n.icon} size={18} stroke={active ? 2.2 : 1.8} />
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
              width: 36,
              height: 36,
              borderRadius: 18,
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
                fontSize: 13,
                fontWeight: 700,
                color: palette.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name}
            </div>
            <div style={{ fontSize: 11, color: palette.muted }}>Admin</div>
          </div>
          <button
            onClick={() => {
              void logout();
              setNavOpen(false);
              router.replace("/login");
            }}
            className="tw-tap"
            aria-label="Sign out"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${palette.border}`,
              background: "transparent",
              color: palette.text,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Sign out
          </button>
        </div>
      </MobileNavDrawer>
    </div>
  );
}
