"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface Rule {
  id: string;
  name: string;
  kind: "weekend" | "peak" | "holiday" | "blackout";
  surchargePct: string | number;
  daysOfWeek: number[];
  appliesTo: "rent" | "sell" | "both";
  active: boolean;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PricingRulesPage(): JSX.Element {
  const qc = useQueryClient();
  const q = useQuery<{ data: Rule[] }>({
    queryKey: ["pricing-rules"],
    queryFn: () => authedFetch("/api/admin/pricing-rules"),
  });
  const [d, setD] = useState({
    name: "",
    kind: "weekend" as const,
    surchargePct: 15,
    daysOfWeek: [5, 6] as number[],
    appliesTo: "rent" as const,
  });

  const create = useMutation({
    mutationFn: () =>
      authedFetch("/api/admin/pricing-rules", {
        method: "POST",
        body: JSON.stringify({ ...d, dateRanges: [], active: true }),
      }),
    onSuccess: () => {
      setD({ name: "", kind: "weekend", surchargePct: 15, daysOfWeek: [5, 6], appliesTo: "rent" });
      void qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => authedFetch(`/api/admin/pricing-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      authedFetch(`/api/admin/pricing-rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });

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
          PRICING RULES
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
            margin: "4px 0 0",
            textTransform: "uppercase",
          }}
        >
          Surcharges<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 14,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <input
          value={d.name}
          onChange={(e) => setD({ ...d, name: e.target.value })}
          placeholder="Rule name (e.g. Weekend surcharge)"
          style={inp}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={d.kind}
            onChange={(e) => setD({ ...d, kind: e.target.value as never })}
            style={inp}
          >
            <option value="weekend">Weekend</option>
            <option value="peak">Peak season</option>
            <option value="holiday">Holiday</option>
            <option value="blackout">Blackout</option>
          </select>
          <input
            type="number"
            value={d.surchargePct}
            onChange={(e) => setD({ ...d, surchargePct: Number(e.target.value) })}
            placeholder="Surcharge %"
            style={inp}
          />
          <select
            value={d.appliesTo}
            onChange={(e) => setD({ ...d, appliesTo: e.target.value as never })}
            style={inp}
          >
            <option value="rent">Rentals</option>
            <option value="sell">Sales</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DAY_LABELS.map((label, i) => {
            const on = d.daysOfWeek.includes(i);
            return (
              <button
                key={i}
                onClick={() =>
                  setD({
                    ...d,
                    daysOfWeek: on
                      ? d.daysOfWeek.filter((x) => x !== i)
                      : [...d.daysOfWeek, i].sort(),
                  })
                }
                style={{
                  ...chip,
                  background: on ? colors.brand.friendlyBlue : "#fff",
                  color: on ? "#fff" : "#4B4A6B",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button onClick={() => create.mutate()} disabled={!d.name} style={primaryBtn}>
          Create rule
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(q.data?.data ?? []).map((r) => (
          <div
            key={r.id}
            style={{
              background: "#fff",
              border: "1px solid #ECECF1",
              borderRadius: 12,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.brand.trustWorth }}>
                {r.name}
              </div>
              <div style={{ fontSize: 11, color: "#6B6A85", marginTop: 2 }}>
                +{Number(r.surchargePct)}% · {r.kind} ·{" "}
                {r.daysOfWeek.map((i) => DAY_LABELS[i]).join(", ") || "any day"} · {r.appliesTo}
              </div>
            </div>
            <button
              onClick={() => toggle.mutate({ id: r.id, active: !r.active })}
              style={{ ...chip, color: r.active ? colors.brand.ecoLimelight : "#9E9DAE" }}
            >
              {r.active ? "● On" : "○ Off"}
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete rule "${r.name}"?`)) remove.mutate(r.id);
              }}
              style={{ ...chip, color: colors.brand.ultraRed }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #ECECF1",
  borderRadius: 8,
  fontSize: 13,
  background: "#F7F7FB",
  flex: 1,
  minWidth: 140,
};
const chip: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #ECECF1",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
  padding: "10px 22px",
  border: "none",
  borderRadius: 10,
  background: colors.brand.friendlyBlue,
  color: "#fff",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  alignSelf: "flex-start",
};
