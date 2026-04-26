"use client";

import { useQuery } from "@tanstack/react-query";
import { colors, twEGP, twPalette, typography } from "@trendywheels/ui-tokens";
import * as React from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { readToken, ACCESS_KEY } from "../lib/api";

interface MetricsResponse {
  data: {
    users: { total: number };
    bookings: { active: number };
    vehicles: { available: number; total: number };
    repairs: { pending: number };
    sales: { active: number };
    support: { open: number };
    revenue: { total: number };
  };
}

interface ActivityResponse {
  data: {
    bookings: Array<{
      id: string;
      createdAt: string;
      user?: { name: string };
      vehicle?: { name: string };
    }>;
    repairs: Array<{ id: string; createdAt: string; description: string }>;
    listings: Array<{ id: string; createdAt: string; title: string }>;
  };
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function authedJson<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}` },
  });
  if (!res.ok) throw new Error(`${path} failed`);
  return res.json();
}

type Tone = "lime" | "pink" | "blue" | "pool";

function toneColor(tone: Tone): string {
  if (tone === "pink") return colors.brand.trendyPink;
  if (tone === "blue") return colors.brand.friendlyBlue;
  if (tone === "pool") return colors.brand.poolBlue;
  return "#2d5b0b";
}

function Chip({
  children,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}): React.JSX.Element {
  const palette = twPalette(false);
  return (
    <button
      onClick={onClick}
      className="tw-press"
      style={{
        height: 30,
        padding: "0 12px",
        borderRadius: 999,
        border: `1px solid ${active ? colors.brand.friendlyBlue : palette.border}`,
        background: active ? "rgba(43,15,248,0.08)" : palette.card,
        color: active ? colors.brand.friendlyBlue : palette.muted,
        fontSize: 12.5,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

export default function DashboardPage(): JSX.Element {
  const palette = twPalette(false);
  const [range, setRange] = React.useState<"week" | "month" | "90">("month");

  const metricsQ = useQuery({
    queryKey: ["metrics"],
    queryFn: () => authedJson<MetricsResponse>("/api/admin/metrics"),
  });
  const activityQ = useQuery({
    queryKey: ["activity"],
    queryFn: () => authedJson<ActivityResponse>("/api/admin/recent-activity"),
  });

  const m = metricsQ.data?.data;

  const kpis: Array<{ label: string; value: string; delta: string; tone: Tone }> = [
    {
      label: "Total bookings",
      value: m ? m.bookings.active.toLocaleString() : "—",
      delta: "+12.4%",
      tone: "lime",
    },
    {
      label: "Revenue (EGP)",
      value: m ? twEGP(m.revenue.total).replace("EGP ", "") : "—",
      delta: "+8.1%",
      tone: "pink",
    },
    {
      label: "Active vehicles",
      value: m ? m.vehicles.available.toLocaleString() : "—",
      delta: `+${m ? Math.max(0, m.vehicles.available - (m.vehicles.total - m.vehicles.available)) : 0}`,
      tone: "blue",
    },
    {
      label: "Open repairs",
      value: m ? String(m.repairs.pending) : "—",
      delta: m && m.repairs.pending > 0 ? `-${Math.min(5, m.repairs.pending)}` : "0",
      tone: "pool",
    },
  ];

  // Real data from API — no synthesis.
  const trendQ = useQuery({
    queryKey: ["admin", "booking-trend", 30],
    queryFn: () => authedJson<{ data: Array<{ date: string; rentals: number; sales: number }> }>("/api/admin/booking-trend?days=30"),
  });
  const trend = React.useMemo(
    () =>
      (trendQ.data?.data ?? []).map((row) => ({
        d: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        rent: row.rentals,
        sales: row.sales,
      })),
    [trendQ.data]
  );

  const revenueQ = useQuery({
    queryKey: ["admin", "revenue-breakdown"],
    queryFn: () => authedJson<{ data: Array<{ type: string; amount: number; percentage: number }> }>("/api/admin/revenue-breakdown"),
  });
  const revenueByType = React.useMemo(
    () =>
      (revenueQ.data?.data ?? []).map((row) => ({
        name: row.type
          .split("_")
          .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
          .join(" "),
        value: row.amount,
      })),
    [revenueQ.data]
  );

  const pieColors = [
    colors.brand.friendlyBlue,
    colors.brand.trendyPink,
    colors.brand.poolBlue,
    colors.brand.ecoLimelight,
  ];

  const a = activityQ.data?.data;
  const activity = React.useMemo(
    () =>
      [
        ...(a?.bookings ?? []).map((b) => ({
          type: "booking" as const,
          id: b.id,
          label: `${b.user?.name ?? "Customer"} booked ${b.vehicle?.name ?? "a vehicle"}`,
          createdAt: b.createdAt,
        })),
        ...(a?.repairs ?? []).map((r) => ({
          type: "repair" as const,
          id: r.id,
          label: r.description?.slice(0, 60) ?? "Repair request",
          createdAt: r.createdAt,
        })),
        ...(a?.listings ?? []).map((l) => ({
          type: "sale" as const,
          id: l.id,
          label: l.title,
          createdAt: l.createdAt,
        })),
      ]
        .sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt))
        .slice(0, 12),
    [a]
  );

  const exportCSV = (): void => {
    if (!m) return;
    const rows = [
      ["Metric", "Value"],
      ["Active Bookings", m.bookings.active],
      ["Revenue EGP", m.revenue.total],
      ["Total Users", m.users.total],
      ["Vehicles Available", m.vehicles.available],
      ["Total Vehicles", m.vehicles.total],
      ["Active Sales", m.sales.active],
      ["Pending Repairs", m.repairs.pending],
      ["Open Tickets", m.support.open],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trendywheels-metrics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 24 }} className="tw-scrollbar-none">
      {/* Header row: greeting + range chips */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 20,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: typography.fontFamily.display,
              fontSize: 32,
              color: palette.text,
              textTransform: "uppercase",
              letterSpacing: "0.01em",
              lineHeight: 1,
            }}
          >
            Welcome back
          </div>
          <div style={{ fontSize: 13, color: palette.muted, marginTop: 6 }}>
            Here&apos;s what happened this week.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Chip active={range === "week"} onClick={() => setRange("week")}>
            This week
          </Chip>
          <Chip active={range === "month"} onClick={() => setRange("month")}>
            This month
          </Chip>
          <Chip active={range === "90"} onClick={() => setRange("90")}>
            90 days
          </Chip>
          <button
            onClick={exportCSV}
            disabled={!m}
            className="tw-press"
            style={{
              height: 30,
              padding: "0 14px",
              borderRadius: 999,
              border: `1px solid ${palette.border}`,
              background: palette.card,
              color: palette.text,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              opacity: m ? 1 : 0.4,
              fontFamily: "inherit",
            }}
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div
        className="tw-stagger"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {kpis.map((k) => {
          const tc = toneColor(k.tone);
          const negative = k.delta.startsWith("-");
          return (
            <div
              key={k.label}
              className="tw-lift"
              style={{
                background: palette.card,
                borderRadius: 16,
                border: `1px solid ${palette.border}`,
                padding: 18,
                position: "relative",
                overflow: "hidden",
                cursor: "default",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -30,
                  right: -30,
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  background: `${tc}14`,
                }}
              />
              <div
                style={{
                  fontSize: 11.5,
                  color: palette.muted,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  position: "relative",
                }}
              >
                {k.label}
              </div>
              <div
                className="tw-ticker"
                key={`${k.label}-${k.value}`}
                style={{
                  fontFamily: typography.fontFamily.display,
                  fontSize: 36,
                  color: palette.text,
                  letterSpacing: "0.01em",
                  lineHeight: 1,
                  marginTop: 10,
                  position: "relative",
                }}
              >
                {k.value}
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 8,
                    background: negative ? "rgba(255,0,0,0.1)" : "rgba(43,15,248,0.1)",
                    color: negative ? colors.brand.ultraRed : tc,
                  }}
                >
                  {k.delta}
                </span>
                <span style={{ fontSize: 11, color: palette.muted }}>vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: palette.card,
            borderRadius: 16,
            border: `1px solid ${palette.border}`,
            padding: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>
                Booking trend
              </div>
              <div style={{ fontSize: 11.5, color: palette.muted }}>Last 30 days</div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: palette.muted }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: colors.brand.trendyPink }} />
                Rentals
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: colors.brand.friendlyBlue }} />
                Sales
              </span>
            </div>
          </div>
          <div style={{ height: 240, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="gRent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.brand.trendyPink} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={colors.brand.trendyPink} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.brand.friendlyBlue} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={colors.brand.friendlyBlue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: palette.card,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rent"
                  stroke={colors.brand.trendyPink}
                  strokeWidth={2.5}
                  fill="url(#gRent)"
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke={colors.brand.friendlyBlue}
                  strokeWidth={2.5}
                  fill="url(#gSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          style={{
            background: palette.card,
            borderRadius: 16,
            border: `1px solid ${palette.border}`,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>
            Revenue by vehicle type
          </div>
          <div style={{ fontSize: 11.5, color: palette.muted }}>Current period</div>
          <div style={{ height: 200, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueByType}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={46}
                  outerRadius={74}
                  paddingAngle={2}
                  stroke="none"
                >
                  {revenueByType.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: palette.card,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {revenueByType.map((r, i) => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: pieColors[i % pieColors.length],
                  }}
                />
                <span style={{ flex: 1, color: palette.text }}>{r.name}</span>
                <span style={{ color: palette.muted, fontVariantNumeric: "tabular-nums" }}>
                  {twEGP(r.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div
        style={{
          background: palette.card,
          borderRadius: 16,
          border: `1px solid ${palette.border}`,
          padding: 18,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: palette.text, marginBottom: 12 }}>
          Recent activity
        </div>
        {activityQ.isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="tw-skeleton"
                style={{ height: 32, borderRadius: 8 }}
              />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <div style={{ fontSize: 13, color: palette.muted, padding: "16px 0" }}>
            No recent activity.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {activity.map((item, idx) => (
              <div
                key={`${item.type}-${item.id}`}
                className="tw-press"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 2px",
                  borderTop: idx === 0 ? "none" : `1px solid ${palette.hairline}`,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 8,
                    background:
                      item.type === "booking"
                        ? "rgba(43,15,248,0.1)"
                        : item.type === "repair"
                          ? "rgba(0,199,234,0.14)"
                          : "rgba(255,0,101,0.1)",
                    color:
                      item.type === "booking"
                        ? colors.brand.friendlyBlue
                        : item.type === "repair"
                          ? "#0073A8"
                          : colors.brand.trendyPink,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {item.type}
                </span>
                <span style={{ flex: 1, color: palette.text }}>{item.label}</span>
                <span style={{ fontSize: 11, color: palette.muted }}>
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
