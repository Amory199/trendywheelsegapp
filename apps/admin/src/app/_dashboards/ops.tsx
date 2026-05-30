"use client";

import { useQuery } from "@tanstack/react-query";
import { twPalette } from "@trendywheels/ui-tokens";
import Link from "next/link";
import * as React from "react";

import { DashboardChrome, StatCard, authedJson } from "./shared";

interface ListEnvelope<T> {
  data: T[];
  total?: number;
}

interface MaintenanceRow {
  id: string;
  status: string;
  createdAt: string;
  vehicle?: { name?: string };
}

interface RepairRow {
  id: string;
  status: string;
  description?: string;
  createdAt: string;
}

interface TransportRow {
  id: string;
  status: string;
  pickupAddress?: string;
  scheduledFor?: string;
}

// Ops / inventory / mechanic workspace. Surfaces today's work queue:
// open maintenance, repairs in progress, transport pickups due.
export function OpsDashboard(): React.JSX.Element {
  const palette = twPalette(false);

  const maintenanceQ = useQuery({
    queryKey: ["dash", "ops", "maintenance"],
    queryFn: () =>
      authedJson<ListEnvelope<MaintenanceRow>>("/api/maintenance?limit=10").catch(() => ({
        data: [],
      })),
  });
  const repairsQ = useQuery({
    queryKey: ["dash", "ops", "repairs"],
    queryFn: () =>
      authedJson<ListEnvelope<RepairRow>>("/api/repairs?limit=10").catch(() => ({ data: [] })),
  });
  const transportQ = useQuery({
    queryKey: ["dash", "ops", "transport"],
    queryFn: () =>
      authedJson<ListEnvelope<TransportRow>>("/api/transport?limit=10").catch(() => ({ data: [] })),
  });

  const openMaint = (maintenanceQ.data?.data ?? []).filter((m) => m.status !== "completed").length;
  const openRepairs = (repairsQ.data?.data ?? []).filter(
    (r) => r.status !== "completed" && r.status !== "rejected",
  ).length;
  const todaysTransport = (transportQ.data?.data ?? []).filter(
    (t) => t.scheduledFor && isToday(t.scheduledFor),
  ).length;

  return (
    <DashboardChrome
      pageKey="admin:dashboard"
      title="Ops workspace"
      subtitle="Maintenance, repairs, and pickups scheduled for today."
      quickActions={[
        { label: "+ New maintenance", href: "/maintenance", tone: "primary" },
        { label: "Vehicles", href: "/vehicles", tone: "secondary" },
      ]}
      stats={
        <>
          <StatCard
            label="Open maintenance"
            value={maintenanceQ.isLoading ? "…" : openMaint}
            loading={maintenanceQ.isLoading}
            onClick={() => (window.location.href = "/maintenance")}
          />
          <StatCard
            label="Active repairs"
            value={repairsQ.isLoading ? "…" : openRepairs}
            loading={repairsQ.isLoading}
            tone="warning"
            onClick={() => (window.location.href = "/repairs")}
          />
          <StatCard
            label="Pickups today"
            value={transportQ.isLoading ? "…" : todaysTransport}
            loading={transportQ.isLoading}
            tone="accent"
            onClick={() => (window.location.href = "/transport")}
          />
          <StatCard
            label="Fleet"
            value="—"
            hint="see Vehicles"
            onClick={() => (window.location.href = "/vehicles")}
          />
        </>
      }
      lists={
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <Panel title="Maintenance queue" empty="No open jobs." palette={palette}>
            {(maintenanceQ.data?.data ?? [])
              .filter((m) => m.status !== "completed")
              .slice(0, 5)
              .map((m, idx) => (
                <Link key={m.id} href={`/maintenance`} style={rowStyle(idx, palette)}>
                  <span style={ellipsis}>{m.vehicle?.name ?? "Vehicle"}</span>
                  <span style={dimRight(palette)}>{m.status}</span>
                </Link>
              ))}
          </Panel>
          <Panel title="Active repairs" empty="Nothing in the bay." palette={palette}>
            {(repairsQ.data?.data ?? [])
              .filter((r) => r.status !== "completed" && r.status !== "rejected")
              .slice(0, 5)
              .map((r, idx) => (
                <Link key={r.id} href={`/repairs`} style={rowStyle(idx, palette)}>
                  <span style={ellipsis}>{r.description?.slice(0, 50) ?? "Repair"}</span>
                  <span style={dimRight(palette)}>{r.status}</span>
                </Link>
              ))}
          </Panel>
          <Panel title="Transport today" empty="No pickups today." palette={palette}>
            {(transportQ.data?.data ?? [])
              .filter((t) => t.scheduledFor && isToday(t.scheduledFor))
              .slice(0, 5)
              .map((t, idx) => (
                <Link key={t.id} href={`/transport`} style={rowStyle(idx, palette)}>
                  <span style={ellipsis}>{t.pickupAddress ?? "Pickup"}</span>
                  <span style={dimRight(palette)}>{t.status}</span>
                </Link>
              ))}
          </Panel>
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

const ellipsis: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function dimRight(palette: ReturnType<typeof twPalette>): React.CSSProperties {
  return {
    fontSize: 11,
    color: palette.muted,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  };
}

function rowStyle(idx: number, palette: ReturnType<typeof twPalette>): React.CSSProperties {
  return {
    display: "flex",
    gap: 12,
    padding: "8px 0",
    textDecoration: "none",
    borderTop: idx === 0 ? "none" : `1px solid ${palette.hairline}`,
    fontSize: 13,
    color: palette.text,
  };
}

function Panel({
  title,
  empty,
  palette,
  children,
}: {
  title: string;
  empty: string;
  palette: ReturnType<typeof twPalette>;
  children: React.ReactNode;
}): React.JSX.Element {
  const arr = React.Children.toArray(children);
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
      {arr.length === 0 ? (
        <div style={{ fontSize: 13, color: palette.muted, padding: "12px 0" }}>{empty}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>{arr}</div>
      )}
    </div>
  );
}
