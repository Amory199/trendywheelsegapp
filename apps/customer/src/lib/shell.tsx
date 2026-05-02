"use client";

import { TWLogoLockup } from "@trendywheels/ui-brand/web";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useEffect } from "react";

import { useAuth } from "./auth-store";

const CUSTOMER_NAV: Array<{ href: string; label: string; match?: string }> = [
  { href: "/", label: "Home" },
  { href: "/rent", label: "Rent" },
  { href: "/sell", label: "Sell" },
  { href: "/repair", label: "Repair" },
  { href: "/bookings", label: "My bookings" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profile" },
];

const CRM_NAV: Array<{ href: string; label: string; match?: string; adminOnly?: boolean }> = [
  { href: "/crm", label: "Dashboard" },
  { href: "/crm/leads", label: "Leads", match: "/crm/leads" },
  { href: "/crm/inventory", label: "Inventory", match: "/crm/inventory" },
  { href: "/crm/pipeline", label: "Pipeline" },
  { href: "/crm/team", label: "Team", adminOnly: true },
  { href: "/crm/rules", label: "Rules", adminOnly: true },
];

export function Shell({ children }: { children: React.ReactNode }): JSX.Element | null {
  const router = useRouter();
  const path = usePathname();
  const { user, initialized, hydrate, logout } = useAuth();

  useEffect(() => {
    if (!initialized) void hydrate();
  }, [initialized, hydrate]);

  useEffect(() => {
    if (initialized && !user && path !== "/login") router.replace("/login");
  }, [initialized, user, path, router]);

  const isStaff = user && (user.accountType === "admin" || user.accountType === "staff");
  const isCrmPath = path.startsWith("/crm");
  // Auto-redirect: staff landing on customer pages → CRM; customers landing on /crm → home.
  useEffect(() => {
    if (!user) return;
    if (isStaff && !isCrmPath && path !== "/login") router.replace("/crm");
    if (!isStaff && isCrmPath) router.replace("/");
  }, [user, isStaff, isCrmPath, path, router]);

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
          background: `linear-gradient(135deg, ${colors.brand.friendlyBlue} 0%, ${colors.brand.trustWorth} 100%)`,
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
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
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
          <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
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
            {isStaff ? (
              <>
                <a
                  href="https://support.trendywheelseg.com"
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
                  Support ↗
                </a>
                <a
                  href="https://inventory.trendywheelseg.com"
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
                  Inventory ↗
                </a>
                {isAdmin ? (
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
              </>
            ) : null}
          </nav>
          <div
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
        </div>
      </header>
      <main
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "28px 24px 48px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {children}
      </main>
    </div>
  );
}
