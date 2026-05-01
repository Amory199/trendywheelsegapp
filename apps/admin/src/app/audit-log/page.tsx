"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface AuditEntry {
  id: string;
  userId: string;
  actingAsId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  diff: unknown;
  createdAt: string;
  user: { id: string; name: string; email: string | null } | null;
}

export default function AuditLogPage(): JSX.Element {
  const [filter, setFilter] = useState({ action: "", entity: "", userId: "" });
  const params = new URLSearchParams();
  if (filter.action) params.set("action", filter.action);
  if (filter.entity) params.set("entity", filter.entity);
  if (filter.userId) params.set("userId", filter.userId);
  params.set("limit", "200");

  const q = useQuery<{ data: AuditEntry[]; total: number }>({
    queryKey: ["audit-log", filter],
    queryFn: () => authedFetch(`/api/admin/audit-logs?${params.toString()}`),
  });

  const items = q.data?.data ?? [];

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
          AUDIT LOG
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
            margin: "4px 0 0",
            textTransform: "uppercase",
          }}
        >
          Every change<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
        <p style={{ color: "#6B6A85", marginTop: 4 }}>
          {q.data?.total ?? 0} entries · filter to dig in
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={filter.action}
          onChange={(e) => setFilter({ ...filter, action: e.target.value })}
          placeholder="Action (e.g. promo.create)"
          style={inp}
        />
        <input
          value={filter.entity}
          onChange={(e) => setFilter({ ...filter, entity: e.target.value })}
          placeholder="Entity (e.g. user)"
          style={inp}
        />
        <input
          value={filter.userId}
          onChange={(e) => setFilter({ ...filter, userId: e.target.value })}
          placeholder="Actor user ID"
          style={inp}
        />
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
            gridTemplateColumns: "180px 1fr 1fr 200px 120px",
            padding: "12px 16px",
            fontSize: 11,
            fontWeight: 700,
            color: "#6B6A85",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            borderBottom: "1px solid #ECECF1",
          }}
        >
          <span>When</span>
          <span>Actor</span>
          <span>Action</span>
          <span>Entity</span>
          <span>Diff</span>
        </div>
        {items.map((row) => (
          <div
            key={row.id}
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr 1fr 200px 120px",
              padding: "10px 16px",
              fontSize: 12,
              borderTop: "1px solid #F4F4F7",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#6B6A85" }}>{new Date(row.createdAt).toLocaleString()}</span>
            <span style={{ color: colors.brand.trustWorth, fontWeight: 600 }}>
              {row.user?.name ?? row.userId.slice(0, 8)}
              {row.actingAsId ? (
                <span style={{ color: colors.brand.trendyPink }}> → impersonating</span>
              ) : null}
            </span>
            <span style={{ fontFamily: "monospace", color: colors.brand.friendlyBlue }}>
              {row.action}
            </span>
            <span style={{ color: "#6B6A85", fontSize: 11 }}>
              {row.entity} {row.entityId ? `· ${row.entityId.slice(0, 8)}…` : ""}
            </span>
            <details>
              <summary style={{ cursor: "pointer", color: "#6B6A85", fontSize: 11 }}>
                {row.diff ? "view" : "—"}
              </summary>
              <pre
                style={{
                  fontSize: 10,
                  background: "#F7F7FB",
                  padding: 8,
                  borderRadius: 6,
                  overflow: "auto",
                  maxHeight: 200,
                  marginTop: 4,
                }}
              >
                {JSON.stringify(row.diff, null, 2)}
              </pre>
            </details>
          </div>
        ))}
        {items.length === 0 && !q.isLoading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#6B6A85", fontSize: 13 }}>
            No matching entries.
          </div>
        ) : null}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #ECECF1",
  borderRadius: 10,
  fontSize: 13,
  background: "#fff",
  flex: 1,
  minWidth: 200,
  fontFamily: "inherit",
};
