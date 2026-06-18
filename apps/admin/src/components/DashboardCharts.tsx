"use client";

import { colors, twEGP, twPalette } from "@trendywheels/ui-tokens";
import type { JSX } from "react";
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

// Recharts-owning chart row for the superadmin dashboard. Split out of
// `app/page.tsx` and loaded via `next/dynamic({ ssr: false })` so recharts
// stays out of the critical bundle. Visual output + data shapes are identical
// to the inline version — only the import boundary moved.
export function DashboardCharts({
  trend,
  revenueByType,
}: {
  trend: Array<{ d: string; rent: number; sales: number }>;
  revenueByType: Array<{ name: string; value: number }>;
}): JSX.Element {
  const palette = twPalette(false);
  const pieColors = [
    colors.brand.friendlyBlue,
    colors.brand.trendyPink,
    colors.brand.poolBlue,
    colors.brand.ecoLimelight,
  ];

  return (
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
            <div style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>Booking trend</div>
            <div style={{ fontSize: 11.5, color: palette.muted }}>Last 30 days</div>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: palette.muted }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: colors.brand.trendyPink,
                }}
              />
              Rentals
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: colors.brand.friendlyBlue,
                }}
              />
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
            <div
              key={r.name}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
            >
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
  );
}

export default DashboardCharts;
