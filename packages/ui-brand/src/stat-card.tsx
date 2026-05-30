import * as React from "react";

// Single KPI tile. Compositions of these form dashboards. Lean by design —
// no charts, no loading placeholder built-in; callers pass `loading` and we
// just shimmer the value row.

export interface StatCardProps {
  label: string;
  value: string | number | React.ReactNode;
  delta?: { value: string; tone: "up" | "down" | "flat" };
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
  tone?: "default" | "warning" | "danger" | "accent";
}

const TONES = {
  default: { border: "#E5E7EB", accent: "#2B0FF8" },
  warning: { border: "#FCD34D", accent: "#D97706" },
  danger: { border: "#FCA5A5", accent: "#DC2626" },
  accent: { border: "#FBCFE8", accent: "#FF0065" },
} as const;

const DELTA_COLORS = { up: "#059669", down: "#DC2626", flat: "#6B7280" } as const;

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon,
  loading,
  onClick,
  tone = "default",
}: StatCardProps): React.JSX.Element {
  const { border, accent } = TONES[tone];
  const Component = onClick ? "button" : ("div" as const);
  return (
    <Component
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 16,
        borderRadius: 10,
        border: `1px solid ${border}`,
        background: "#FFFFFF",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        minWidth: 0,
        font: "inherit",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
      >
        <span style={{ fontSize: 12, color: "#6B7280", letterSpacing: "0.01em" }}>{label}</span>
        {icon ? <span style={{ color: accent, display: "inline-flex" }}>{icon}</span> : null}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1.1,
          minHeight: 32,
        }}
      >
        {loading ? (
          <span
            style={{
              display: "inline-block",
              width: 80,
              height: 24,
              borderRadius: 4,
              background: "linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%)",
              backgroundSize: "200% 100%",
              animation: "twshimmer 1.2s ease-in-out infinite",
            }}
          />
        ) : (
          value
        )}
      </div>
      {(delta || hint) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          {delta ? (
            <span style={{ color: DELTA_COLORS[delta.tone], fontWeight: 600 }}>{delta.value}</span>
          ) : null}
          {hint ? <span style={{ color: "#6B7280" }}>{hint}</span> : null}
        </div>
      )}
    </Component>
  );
}
