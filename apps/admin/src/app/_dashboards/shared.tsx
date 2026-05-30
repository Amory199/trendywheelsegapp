"use client";

import { PageHeader } from "@trendywheels/ui-brand/page-header";
import { StatCard } from "@trendywheels/ui-brand/stat-card";
import { twPalette } from "@trendywheels/ui-tokens";
import Link from "next/link";
import * as React from "react";

import { readToken, ACCESS_KEY } from "../../lib/api";
import { TourHelpButton } from "../../lib/tour-help-button";

// Auth-aware fetcher shared by every role-specific dashboard. Returns parsed
// JSON or throws — React Query handles retry/backoff/error display.
export const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function authedJson<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}` },
  });
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return res.json();
}

export interface QuickAction {
  label: string;
  href: string;
  tone?: "primary" | "secondary";
}

export interface DashboardChromeProps {
  pageKey: string;
  title: string;
  subtitle: string;
  quickActions: QuickAction[];
  stats: React.ReactNode;
  lists?: React.ReactNode;
}

// Standard role-dashboard layout: header, stat grid, optional lists below.
// Each role dashboard composes this so visuals stay consistent.
export function DashboardChrome({
  pageKey,
  title,
  subtitle,
  quickActions,
  stats,
  lists,
}: DashboardChromeProps): React.JSX.Element {
  const palette = twPalette(false);
  return (
    <div data-tour={`${pageKey}-root`}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        helpButton={<TourHelpButton pageKey={pageKey} />}
        rightSlot={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                data-tour={`${pageKey}-action-${a.href.replace(/\//g, "")}`}
                style={{
                  height: 32,
                  padding: "0 14px",
                  borderRadius: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  border:
                    a.tone === "secondary" ? `1px solid ${palette.border}` : "1px solid #2B0FF8",
                  background: a.tone === "secondary" ? palette.card : "#2B0FF8",
                  color: a.tone === "secondary" ? palette.text : "#FFFFFF",
                }}
              >
                {a.label}
              </Link>
            ))}
          </div>
        }
      />
      <div style={{ padding: 24 }}>
        <div
          data-tour={`${pageKey}-stats`}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {stats}
        </div>
        {lists}
      </div>
    </div>
  );
}

export { StatCard };
