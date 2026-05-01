"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

export default function OpsPage(): JSX.Element {
  const qc = useQueryClient();
  const [last, setLast] = useState<Record<string, string>>({});

  const fire = useMutation({
    mutationFn: (path: string) => authedFetch(path, { method: "POST" }),
    onSuccess: (_, path) => {
      setLast((s) => ({ ...s, [path]: new Date().toLocaleTimeString() }));
      void qc.invalidateQueries();
    },
  });

  const Tile = ({
    title,
    desc,
    path,
    accent,
  }: {
    title: string;
    desc: string;
    path: string;
    accent: string;
  }): JSX.Element => (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ECECF1",
        borderTop: `3px solid ${accent}`,
        borderRadius: 14,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 22,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}
      >
        {title}
      </div>
      <p style={{ fontSize: 13, color: "#6B6A85", margin: 0, lineHeight: 1.5 }}>{desc}</p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
        }}
      >
        <span style={{ fontSize: 11, color: "#9E9DAE" }}>
          {last[path] ? `Last fired ${last[path]}` : "Never fired this session"}
        </span>
        <button
          onClick={() => fire.mutate(path)}
          disabled={fire.isPending}
          style={{
            padding: "8px 18px",
            border: "none",
            borderRadius: 10,
            background: accent,
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: fire.isPending ? "wait" : "pointer",
          }}
        >
          Run now
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.brand.trendyPink,
            letterSpacing: "0.12em",
          }}
        >
          POWER TOOLS
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
            margin: "4px 0 0",
            textTransform: "uppercase",
          }}
        >
          Operations<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
        <p style={{ color: "#6B6A85", marginTop: 4 }}>
          Manually trigger background jobs that normally run on schedule.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <Tile
          title="Run lead sweep"
          desc="Evaluate every assigned lead against CRM rules right now. Reassigns missed leads + sends notifications."
          path="/api/admin/ops/run-lead-sweep"
          accent={colors.brand.trendyPink}
        />
        <Tile
          title="Run alert eval"
          desc="Recompute fleet alerts (utilization, maintenance due, repair stack) and refresh the alert feed."
          path="/api/admin/ops/run-alert-eval"
          accent={colors.brand.friendlyBlue}
        />
      </div>
    </div>
  );
}
