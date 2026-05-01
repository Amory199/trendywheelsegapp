"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface Target {
  id: string;
  agentId: string;
  targetMonthly: string | number;
  month: string;
  commissionPct: string | number;
  agent: { id: string; name: string; email: string | null };
}

interface Agent {
  id: string;
  name: string;
  email: string | null;
  staffRole: string | null;
}

export default function SalesTargetsPage(): JSX.Element {
  const qc = useQueryClient();
  const tQ = useQuery<{ data: Target[] }>({
    queryKey: ["sales-targets"],
    queryFn: () => authedFetch("/api/admin/sales-targets"),
  });
  const aQ = useQuery<{ data: Agent[] }>({
    queryKey: ["crm-team"],
    queryFn: () => authedFetch("/api/crm/team"),
  });
  const sales = (aQ.data?.data ?? []).filter(
    (a) => a.staffRole === "sales" || a.staffRole === "admin",
  );

  const monthIso = new Date().toISOString().slice(0, 7);
  const [draft, setDraft] = useState({
    agentId: "",
    targetMonthly: 0,
    commissionPct: 5,
    month: monthIso,
  });

  const save = useMutation({
    mutationFn: () =>
      authedFetch("/api/admin/sales-targets", {
        method: "POST",
        body: JSON.stringify({ ...draft, month: `${draft.month}-01T00:00:00Z` }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-targets"] }),
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
          SALES TARGETS
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
            margin: "4px 0 0",
            textTransform: "uppercase",
          }}
        >
          Quotas & commission<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 14,
          padding: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 8,
        }}
      >
        <select
          value={draft.agentId}
          onChange={(e) => setDraft({ ...draft, agentId: e.target.value })}
          style={inp}
        >
          <option value="">Select agent…</option>
          {sales.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={draft.month}
          onChange={(e) => setDraft({ ...draft, month: e.target.value })}
          style={inp}
        />
        <input
          type="number"
          value={draft.targetMonthly}
          onChange={(e) => setDraft({ ...draft, targetMonthly: Number(e.target.value) })}
          placeholder="EGP target"
          style={inp}
        />
        <input
          type="number"
          value={draft.commissionPct}
          onChange={(e) => setDraft({ ...draft, commissionPct: Number(e.target.value) })}
          placeholder="Commission %"
          style={inp}
        />
        <button
          onClick={() => save.mutate()}
          disabled={!draft.agentId || !draft.targetMonthly}
          style={primaryBtn}
        >
          Save
        </button>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 120px 140px 100px",
            padding: "12px 16px",
            fontSize: 11,
            fontWeight: 700,
            color: "#6B6A85",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            borderBottom: "1px solid #ECECF1",
          }}
        >
          <span>Agent</span>
          <span>Month</span>
          <span>Target (EGP)</span>
          <span>Commission</span>
        </div>
        {(tQ.data?.data ?? []).map((t) => (
          <div
            key={t.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 140px 100px",
              padding: "10px 16px",
              fontSize: 12,
              borderTop: "1px solid #F4F4F7",
            }}
          >
            <span style={{ color: colors.brand.trustWorth, fontWeight: 600 }}>{t.agent.name}</span>
            <span style={{ color: "#6B6A85" }}>
              {new Date(t.month).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
            </span>
            <span>{Number(t.targetMonthly).toLocaleString()}</span>
            <span>{Number(t.commissionPct)}%</span>
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
  fontFamily: "inherit",
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
};
