"use client";

import { useQuery } from "@tanstack/react-query";
import { twEGP, twPalette } from "@trendywheels/ui-tokens";
import Link from "next/link";
import * as React from "react";

import { DashboardChrome, StatCard, authedJson } from "./shared";

interface ListEnvelope<T> {
  data: T[];
  total?: number;
}

interface SalesListing {
  id: string;
  title: string;
  price: number;
  status: string;
  createdAt: string;
}

interface BookingRow {
  id: string;
  startDate: string;
  status: string;
  vehicle?: { name?: string };
  user?: { name?: string };
}

interface LeadRow {
  id: string;
  name: string;
  status: string;
}

// Sales workspace. Surfaces: this-month sales counts, today's bookings, open
// leads, recent sales listings. Quick actions for the most common create paths.
export function SalesDashboard(): React.JSX.Element {
  const palette = twPalette(false);

  const salesQ = useQuery({
    queryKey: ["dash", "sales", "listings"],
    queryFn: () => authedJson<ListEnvelope<SalesListing>>("/api/sales?limit=8"),
  });
  const bookingsQ = useQuery({
    queryKey: ["dash", "sales", "bookings"],
    queryFn: () => authedJson<ListEnvelope<BookingRow>>("/api/bookings?limit=8"),
  });
  const leadsQ = useQuery({
    queryKey: ["dash", "sales", "leads"],
    queryFn: () =>
      authedJson<ListEnvelope<LeadRow>>("/api/crm/leads?status=new&limit=5").catch(() => ({
        data: [],
      })),
  });

  const openListings = (salesQ.data?.data ?? []).filter((l) => l.status !== "sold").length;
  const todaysBookings = (bookingsQ.data?.data ?? []).filter((b) => isToday(b.startDate)).length;
  const monthlyRevenue = (salesQ.data?.data ?? [])
    .filter((l) => l.status === "sold" && isThisMonth(l.createdAt))
    .reduce((sum, l) => sum + (l.price || 0), 0);

  return (
    <DashboardChrome
      pageKey="admin:dashboard"
      title="Sales workspace"
      subtitle="Listings, bookings, and leads that need attention right now."
      quickActions={[
        { label: "+ New sale", href: "/sales", tone: "primary" },
        { label: "Add customer", href: "/customers", tone: "secondary" },
      ]}
      stats={
        <>
          <StatCard
            label="Open listings"
            value={salesQ.isLoading ? "…" : openListings}
            loading={salesQ.isLoading}
            onClick={() => (window.location.href = "/sales")}
          />
          <StatCard
            label="Bookings today"
            value={bookingsQ.isLoading ? "…" : todaysBookings}
            loading={bookingsQ.isLoading}
            tone="accent"
            onClick={() => (window.location.href = "/bookings")}
          />
          <StatCard
            label="New leads"
            value={leadsQ.isLoading ? "…" : (leadsQ.data?.data.length ?? 0)}
            loading={leadsQ.isLoading}
            tone="warning"
            onClick={() => (window.location.href = "/customers")}
          />
          <StatCard
            label="This month sold"
            value={salesQ.isLoading ? "…" : twEGP(monthlyRevenue)}
            loading={salesQ.isLoading}
          />
        </>
      }
      lists={
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <ListPanel
            title="Recent listings"
            empty="No listings yet."
            rows={(salesQ.data?.data ?? []).slice(0, 6).map((l) => ({
              key: l.id,
              left: l.title,
              right: l.status,
              href: `/sales`,
            }))}
            palette={palette}
          />
          <ListPanel
            title="Upcoming bookings"
            empty="No upcoming bookings."
            rows={(bookingsQ.data?.data ?? []).slice(0, 6).map((b) => ({
              key: b.id,
              left: `${b.user?.name ?? "Customer"} — ${b.vehicle?.name ?? ""}`,
              right: new Date(b.startDate).toLocaleDateString(),
              href: `/bookings`,
            }))}
            palette={palette}
          />
        </div>
      }
    />
  );
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

interface ListPanelProps {
  title: string;
  empty: string;
  rows: Array<{ key: string; left: string; right: string; href: string }>;
  palette: ReturnType<typeof twPalette>;
}

function ListPanel({ title, empty, rows, palette }: ListPanelProps): React.JSX.Element {
  return (
    <div
      style={{
        background: palette.card,
        borderRadius: 12,
        border: `1px solid ${palette.border}`,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: palette.text, marginBottom: 10 }}>
        {title}
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: palette.muted, padding: "12px 0" }}>{empty}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map((r, idx) => (
            <Link
              key={r.key}
              href={r.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                textDecoration: "none",
                borderTop: idx === 0 ? "none" : `1px solid ${palette.hairline}`,
                fontSize: 13,
                color: palette.text,
              }}
            >
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.left}
              </span>
              <span style={{ fontSize: 11, color: palette.muted }}>{r.right}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
