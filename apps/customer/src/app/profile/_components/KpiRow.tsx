"use client";

import type { JSX } from "react";
interface Stat {
  value: number | string;
  label: string;
}

export function KpiRow({ stats }: { stats: [Stat, Stat, Stat] }): JSX.Element {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ECECF1",
        borderRadius: 16,
        padding: "16px 0",
        display: "flex",
      }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{
            flex: 1,
            textAlign: "center",
            borderLeft: i === 0 ? "none" : "1px solid #ECECF1",
          }}
        >
          <div
            style={{
              fontFamily: "Anton, Impact, sans-serif",
              fontSize: 28,
              letterSpacing: 0.5,
              color: "#1A1933",
            }}
          >
            {s.value}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "#6B6A85",
              marginTop: 2,
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
