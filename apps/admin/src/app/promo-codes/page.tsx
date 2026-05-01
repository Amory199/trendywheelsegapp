"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface Promo {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: string | number;
  appliesTo: "booking" | "sale" | "both";
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  _count: { redemptions: number };
}

export default function PromoCodesPage(): JSX.Element {
  const qc = useQueryClient();
  const q = useQuery<{ data: Promo[] }>({
    queryKey: ["promo-codes"],
    queryFn: () => authedFetch("/api/admin/promo-codes"),
  });
  const [draft, setDraft] = useState<Partial<Promo>>({
    kind: "percent",
    appliesTo: "booking",
    active: true,
  });

  const create = useMutation({
    mutationFn: (body: Partial<Promo>) =>
      authedFetch("/api/admin/promo-codes", {
        method: "POST",
        body: JSON.stringify({ ...body, value: Number(body.value) }),
      }),
    onSuccess: () => {
      setDraft({ kind: "percent", appliesTo: "booking", active: true });
      void qc.invalidateQueries({ queryKey: ["promo-codes"] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Promo> }) =>
      authedFetch(`/api/admin/promo-codes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...body,
          value: body.value !== undefined ? Number(body.value) : undefined,
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["promo-codes"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => authedFetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promo-codes"] }),
  });

  const codes = q.data?.data ?? [];

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
          PROMO CODES
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
            margin: "4px 0 0",
            textTransform: "uppercase",
          }}
        >
          Discounts at checkout<span style={{ color: colors.brand.trendyPink }}>.</span>
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
          gap: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700 }}>New code</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
          }}
        >
          <input
            value={draft.code ?? ""}
            onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
            placeholder="CODE"
            style={input}
          />
          <select
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as "percent" | "fixed" })}
            style={input}
          >
            <option value="percent">Percent (%)</option>
            <option value="fixed">Fixed (EGP)</option>
          </select>
          <input
            type="number"
            value={draft.value ?? ""}
            onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
            placeholder="Value"
            style={input}
          />
          <select
            value={draft.appliesTo}
            onChange={(e) =>
              setDraft({ ...draft, appliesTo: e.target.value as Promo["appliesTo"] })
            }
            style={input}
          >
            <option value="booking">Bookings</option>
            <option value="sale">Sales</option>
            <option value="both">Both</option>
          </select>
          <input
            type="number"
            value={draft.usageLimit ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, usageLimit: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="Usage limit (∞)"
            style={input}
          />
          <input
            type="datetime-local"
            value={draft.expiresAt ?? ""}
            onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value || null })}
            placeholder="Expires"
            style={input}
          />
        </div>
        <button
          onClick={() =>
            create.mutate({
              ...draft,
              expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : undefined,
            })
          }
          disabled={!draft.code || !draft.value || create.isPending}
          style={primaryBtn}
        >
          {create.isPending ? "Creating…" : "Create code"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {codes.map((c) => (
          <div
            key={c.id}
            style={{
              background: "#fff",
              border: "1px solid #ECECF1",
              borderRadius: 12,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 16,
                fontWeight: 700,
                color: colors.brand.trustWorth,
                minWidth: 120,
              }}
            >
              {c.code}
            </div>
            <div style={{ fontSize: 12, color: "#6B6A85" }}>
              {c.kind === "percent"
                ? `${Number(c.value)}%`
                : `EGP ${Number(c.value).toLocaleString()}`}{" "}
              · {c.appliesTo} · used {c.usedCount}/{c.usageLimit ?? "∞"}
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => update.mutate({ id: c.id, body: { active: !c.active } })}
              style={{ ...secondaryBtn, color: c.active ? colors.brand.ecoLimelight : "#9E9DAE" }}
            >
              {c.active ? "● Active" : "○ Inactive"}
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete code ${c.code}?`)) remove.mutate(c.id);
              }}
              style={{ ...secondaryBtn, color: colors.brand.ultraRed }}
            >
              Delete
            </button>
          </div>
        ))}
        {codes.length === 0 && !q.isLoading ? (
          <div style={{ color: "#6B6A85", fontSize: 13 }}>No codes yet. Create one above.</div>
        ) : null}
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #ECECF1",
  borderRadius: 8,
  fontSize: 13,
  background: "#F7F7FB",
};
const primaryBtn: React.CSSProperties = {
  padding: "10px 22px",
  border: "none",
  borderRadius: 10,
  background: colors.brand.friendlyBlue,
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  alignSelf: "flex-start",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const secondaryBtn: React.CSSProperties = {
  padding: "6px 14px",
  border: "1px solid #ECECF1",
  borderRadius: 8,
  background: "#fff",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};
