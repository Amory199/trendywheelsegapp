"use client";

import {
  MobileNavDrawer,
  TWCloseIcon,
  TWHamburgerIcon,
  TWLogoLockup,
} from "@trendywheels/ui-brand/web";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useEffect, useState } from "react";

import { useAuth } from "./auth-store";

const CUSTOMER_NAV: Array<{ href: string; label: string; match?: string }> = [
  { href: "/", label: "Home" },
  { href: "/buy", label: "Buy" },
  { href: "/rent", label: "Rent" },
  { href: "/sell", label: "Sell" },
  { href: "/service", label: "Service" },
  { href: "/profile", label: "Profile" },
];

const CRM_NAV: Array<{ href: string; label: string; match?: string; adminOnly?: boolean }> = [
  { href: "/crm", label: "Dashboard" },
  { href: "/crm/leads", label: "Leads", match: "/crm/leads" },
  { href: "/crm/inventory", label: "Inventory", match: "/crm/inventory" },
  { href: "/crm/tickets", label: "Tickets", match: "/crm/tickets" },
  { href: "/crm/fleet", label: "Fleet", match: "/crm/fleet" },
  { href: "/crm/pipeline", label: "Pipeline" },
  { href: "/crm/team", label: "Team", adminOnly: true },
  { href: "/crm/rules", label: "Rules", adminOnly: true },
];

export function Shell({ children }: { children: React.ReactNode }): JSX.Element | null {
  const router = useRouter();
  const path = usePathname();
  const { user, initialized, hydrate, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setNavOpen(false);
  }, [path]);

  useEffect(() => {
    if (!initialized) void hydrate();
  }, [initialized, hydrate]);

  // Public paths reachable without auth — Play Store policy requires
  // /account/delete to be world-readable; /support and /legal/privacy linked
  // from the store listing.
  const isPublic =
    path === "/login" ||
    path === "/account/delete" ||
    path === "/support" ||
    path.startsWith("/legal");

  useEffect(() => {
    if (initialized && !user && !isPublic) router.replace("/login");
  }, [initialized, user, isPublic, router]);

  const isStaff = user && (user.accountType === "admin" || user.accountType === "staff");
  const isCrmPath = path.startsWith("/crm");
  // Auto-redirect: staff landing on customer pages → CRM; customers landing on /crm → home.
  useEffect(() => {
    if (!user) return;
    if (isStaff && !isCrmPath && !isPublic) router.replace("/crm");
    if (!isStaff && isCrmPath) router.replace("/");
  }, [user, isStaff, isCrmPath, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (!initialized) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#02011F",
          color: "#fff",
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }
  if (!user) return null;

  const isAdmin = user.accountType === "admin";
  const NAV = isStaff ? CRM_NAV.filter((n) => !n.adminOnly || isAdmin) : CUSTOMER_NAV;
  const badgeLabel = isStaff ? "CRM" : "CUSTOMER";
  const badgeColor = isStaff ? colors.brand.ecoLimelight : colors.brand.trendyPink;
  const badgeText = isStaff ? "#02011F" : "#fff";

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "TW";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F7FB",
        color: colors.brand.trustWorth,
        overflowX: "hidden",
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
      <header
        style={{
          background: `linear-gradient(135deg, ${colors.hero.deep} 0%, ${colors.hero.mid} 55%, ${colors.hero.bright} 100%)`,
          color: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "12px clamp(14px, 4vw, 24px)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Link
            href={isStaff ? "/crm" : "/"}
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}
          >
            <TWLogoLockup size={26} color="#fff" />
          </Link>
          <span
            className="tw-live-dot"
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              background: badgeColor,
              color: badgeText,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.6,
            }}
          >
            {badgeLabel}
          </span>
          {isStaff ? (
            <span
              className="tw-desktop-only"
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.55)",
                fontWeight: 600,
                letterSpacing: 0.4,
              }}
            >
              · {user.name || user.email}
            </span>
          ) : null}
          <div style={{ flex: 1 }} />
          <nav
            className="tw-desktop-only"
            style={{ display: "flex", gap: 4, alignItems: "center" }}
          >
            {NAV.map((n) => {
              const active = n.href === "/" ? path === "/" : path.startsWith(n.match ?? n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? "#fff" : "rgba(255,255,255,0.7)",
                    background: active ? "rgba(255,255,255,0.12)" : "transparent",
                    textDecoration: "none",
                  }}
                >
                  {n.label}
                </Link>
              );
            })}
            {isStaff && isAdmin ? (
              <a
                href="https://admin.trendywheelseg.com"
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.7)",
                  textDecoration: "none",
                }}
              >
                Admin ↗
              </a>
            ) : null}
          </nav>
          <div
            className="tw-desktop-only"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: `linear-gradient(135deg, ${colors.brand.trendyPink}, ${colors.brand.friendlyBlue})`,
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: 12,
              color: "#fff",
            }}
          >
            {initials}
          </div>
          <button
            className="tw-desktop-only"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
          <button
            className="tw-mobile-only tw-tap"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <TWHamburgerIcon size={22} color="#fff" />
          </button>
        </div>
      </header>
      <MobileNavDrawer open={navOpen} onClose={() => setNavOpen(false)} side="right" width={300}>
        <div
          style={{
            background: `linear-gradient(135deg, ${colors.hero.deep} 0%, ${colors.hero.mid} 100%)`,
            color: "#fff",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${colors.brand.trendyPink}, ${colors.brand.friendlyBlue})`,
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: 13,
              color: "#fff",
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name || "Member"}
            </div>
            <div
              style={{
                fontSize: 11,
                opacity: 0.7,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.email}
            </div>
          </div>
          <button
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
            className="tw-tap"
            style={{
              padding: 8,
              borderRadius: 8,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <TWCloseIcon size={20} color="#fff" />
          </button>
        </div>
        <nav
          style={{ padding: "12px 12px 16px", display: "flex", flexDirection: "column", gap: 4 }}
        >
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.match ?? n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: active ? 700 : 500,
                  color: active ? colors.brand.friendlyBlue : colors.brand.trustWorth,
                  background: active ? `${colors.brand.friendlyBlue}14` : "transparent",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {n.label}
              </Link>
            );
          })}
          {isStaff && isAdmin ? (
            <a
              href="https://admin.trendywheelseg.com"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 500,
                color: colors.brand.trustWorth,
                textDecoration: "none",
              }}
            >
              Admin ↗
            </a>
          ) : null}
        </nav>
        <div
          style={{
            padding: "12px 16px",
            marginTop: "auto",
            borderTop: `1px solid ${colors.ink[100]}`,
          }}
        >
          <button
            onClick={() => {
              logout();
              setNavOpen(false);
              router.replace("/login");
            }}
            className="tw-tap"
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: `1px solid ${colors.ink[200]}`,
              background: "transparent",
              color: colors.brand.trustWorth,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </MobileNavDrawer>
      <main
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(16px, 4vw, 28px) clamp(14px, 4vw, 24px) clamp(32px, 8vw, 48px)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {children}
      </main>
    </div>
  );
}
