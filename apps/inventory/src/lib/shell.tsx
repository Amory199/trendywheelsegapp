"use client";

import { TWLogoLockup } from "@trendywheels/ui-brand/web";
import { colors, twPalette } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useEffect } from "react";

import { useAuth } from "./auth-store";

const NAV: Array<{
  href: string;
  label: string;
  icon: keyof typeof NAV_ICONS;
  badge?: string;
  match?: string;
}> = [
  { href: "/availability", label: "Availability", icon: "pin", match: "/availability" },
  { href: "/maintenance", label: "Maintenance", icon: "wrench", match: "/maintenance" },
  { href: "/alerts", label: "Alerts", icon: "bell", badge: "3", match: "/alerts" },
];

const NAV_ICONS = {
  pin: <path d="M12 22s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" strokeLinejoin="round" />,
  wrench: <path d="M14 5l5 5-7 7-9-9 3-3 4 4 4-4z" strokeLinecap="round" strokeLinejoin="round" />,
  bell: <path d="M6 8a6 6 0 1 1 12 0v5l2 3H4l2-3V8zM10 19a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" strokeLinecap="round" /></>,
  chevR: <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
} as const;

function Icon({
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke}>
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
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", color: palette.muted, fontSize: 14 }}>
        Loading…
      </div>
    );
  }
  if (!user) return null;

  const crumbs = ["Inventory", ...(path === "/" ? ["Home"] : path.split("/").filter(Boolean).map(humanCrumb))];
  const initials = user.name?.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() ?? "FM";

  return (
    <div style={{ display: "flex", height: "100vh", background: palette.bg, color: palette.text }}>
      <aside style={{ width: 240, flexShrink: 0, background: palette.card, borderRight: `1px solid ${palette.border}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "22px 20px 4px" }}>
          <TWLogoLockup size={28} color={palette.text} />
        </div>
        <div style={{ padding: "0 20px 18px", fontSize: 10, color: palette.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
          Inventory ops
        </div>
        <div style={{ padding: "0 12px", flex: 1, overflowY: "auto" }} className="tw-scrollbar-none">
          {NAV.map((n) => {
            const active = path.startsWith(n.match ?? n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className="tw-press"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  margin: "2px 0",
                  textDecoration: "none",
                  borderRadius: 10,
                  background: active ? "rgba(43,15,248,0.08)" : "transparent",
                  color: active ? colors.brand.friendlyBlue : palette.muted,
                  fontWeight: active ? 700 : 500,
                  fontSize: 13.5,
                  position: "relative",
                }}
              >
                {active && (
                  <div style={{ position: "absolute", left: -12, top: 8, bottom: 8, width: 3, borderRadius: 2, background: colors.brand.trendyPink }} />
                )}
                <Icon name={n.icon} size={18} stroke={active ? 2.2 : 1.8} />
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.badge ? (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: active ? colors.brand.trendyPink : palette.cardAlt, color: active ? "#fff" : palette.muted }}>
                    {n.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
        <div style={{ padding: 14, borderTop: `1px solid ${palette.hairline}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 17, background: "linear-gradient(135deg,#2B0FF8,#FF0065)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: palette.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name ?? user.email}
            </div>
            <div style={{ fontSize: 10.5, color: palette.muted }}>Fleet manager</div>
          </div>
          <button
            onClick={() => { void logout(); router.replace("/login"); }}
            className="tw-press"
            aria-label="Sign out"
            style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: palette.cardAlt, color: palette.muted, cursor: "pointer", fontSize: 12 }}
          >
            ↗
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ height: 60, padding: "0 24px", borderBottom: `1px solid ${palette.border}`, background: palette.card, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TWLogoLockup size={20} color={colors.brand.friendlyBlue} />
            <span style={{ padding: "3px 8px", borderRadius: 999, background: colors.brand.ecoLimelight, color: "#000", fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
              INVENTORY
            </span>
          </div>
          <div style={{ width: 1, height: 24, background: palette.hairline }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: palette.muted }}>
            {crumbs.map((c, i) => (
              <React.Fragment key={`${c}-${i}`}>
                <span style={{ color: i === crumbs.length - 1 ? palette.text : palette.muted, fontWeight: i === crumbs.length - 1 ? 700 : 500 }}>{c}</span>
                {i < crumbs.length - 1 ? <Icon name="chevR" size={12} color={palette.muted} /> : null}
              </React.Fragment>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ width: 280, height: 36, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderRadius: 10, background: palette.cardAlt, border: `1px solid ${palette.border}`, color: palette.muted, fontSize: 13 }}>
            <Icon name="search" size={15} />
            <span>Search vehicles, work orders…</span>
          </div>
          <button className="tw-press" aria-label="Notifications" style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: palette.cardAlt, color: palette.text, display: "grid", placeItems: "center", cursor: "pointer", position: "relative" }}>
            <Icon name="bell" size={17} />
            <span style={{ position: "absolute", top: 6, right: 7, width: 8, height: 8, borderRadius: 4, background: colors.brand.trendyPink, boxShadow: `0 0 0 2px ${palette.cardAlt}` }} />
          </button>
        </header>
        <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
      </main>
    </div>
  );
}
