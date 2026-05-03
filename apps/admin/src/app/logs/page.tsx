"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface ErrorRow {
  id: string;
  level: "error" | "warn" | "fatal";
  source: string;
  message: string;
  stack: string | null;
  route: string | null;
  method: string | null;
  statusCode: number | null;
  userId: string | null;
  requestId: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  metadata: unknown;
  resolvedAt: string | null;
  createdAt: string;
}

interface OpenCount {
  level: string;
  _count: { _all: number };
}

const LEVEL_STYLES: Record<string, { bg: string; fg: string }> = {
  fatal: { bg: "#7F0000", fg: "#fff" },
  error: { bg: "#FF0000", fg: "#fff" },
  warn: { bg: "#F5B800", fg: "#02011F" },
};

const SOURCE_STYLES: Record<string, string> = {
  api: "#2B0FF8",
  worker: "#A9F453",
  socket: "#00C7EA",
  process: "#FF0065",
  admin: "#5300A8",
  support: "#FF8800",
  inventory: "#1B5E3F",
  customer: "#02011F",
  mobile: "#7F0000",
};

export default function LogsPage(): JSX.Element {
  const qc = useQueryClient();
  const [filter, setFilter] = useState({
    level: "",
    source: "",
    search: "",
    unresolvedOnly: true,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  const params = new URLSearchParams();
  if (filter.level) params.set("level", filter.level);
  if (filter.source) params.set("source", filter.source);
  if (filter.search) params.set("search", filter.search);
  if (filter.unresolvedOnly) params.set("unresolved", "1");
  params.set("limit", "200");

  const q = useQuery<{
    data: ErrorRow[];
    total: number;
    openCounts: OpenCount[];
  }>({
    queryKey: ["error-logs", filter],
    queryFn: () => authedFetch(`/api/admin/error-logs?${params.toString()}`),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      authedFetch(`/api/admin/error-logs/${id}/resolve`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["error-logs"] }),
  });

  const resolveAllMutation = useMutation({
    mutationFn: () =>
      authedFetch("/api/admin/error-logs/resolve-all", {
        method: "POST",
        body: JSON.stringify({
          level: filter.level || undefined,
          source: filter.source || undefined,
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["error-logs"] }),
  });

  const items = q.data?.data ?? [];
  const counts = q.data?.openCounts ?? [];
  const fatalOpen = counts.find((c) => c.level === "fatal")?._count._all ?? 0;
  const errorOpen = counts.find((c) => c.level === "error")?._count._all ?? 0;
  const warnOpen = counts.find((c) => c.level === "warn")?._count._all ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.brand.trendyPink,
              letterSpacing: "0.12em",
            }}
          >
            ERROR LOGS
          </span>
          <h1
            style={{
              fontFamily: "Anton, Impact, sans-serif",
              fontSize: 36,
              margin: "4px 0 0",
              textTransform: "uppercase",
            }}
          >
            Nothing escapes<span style={{ color: colors.brand.trendyPink }}>.</span>
          </h1>
          <p style={{ color: "#6B6A85", marginTop: 4 }}>
            {q.data?.total ?? 0} matching · {fatalOpen} fatal · {errorOpen} error · {warnOpen} warn
            open
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label
            style={{
              fontSize: 12,
              color: "#6B6A85",
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (5s)
          </label>
          <button
            onClick={() => resolveAllMutation.mutate()}
            disabled={resolveAllMutation.isPending || items.length === 0}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #ECECF1",
              background: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {resolveAllMutation.isPending ? "Resolving…" : "Resolve all (filtered)"}
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <KpiTile label="OPEN FATAL" value={fatalOpen} color={LEVEL_STYLES.fatal.bg} />
        <KpiTile label="OPEN ERRORS" value={errorOpen} color={LEVEL_STYLES.error.bg} />
        <KpiTile label="OPEN WARNINGS" value={warnOpen} color={LEVEL_STYLES.warn.bg} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select
          value={filter.level}
          onChange={(e) => setFilter((f) => ({ ...f, level: e.target.value }))}
          style={selStyle}
        >
          <option value="">All levels</option>
          <option value="fatal">Fatal</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
        </select>
        <select
          value={filter.source}
          onChange={(e) => setFilter((f) => ({ ...f, source: e.target.value }))}
          style={selStyle}
        >
          <option value="">All sources</option>
          <option value="api">API</option>
          <option value="worker">Worker</option>
          <option value="socket">Socket</option>
          <option value="process">Process</option>
          <option value="admin">Admin (web)</option>
          <option value="support">Support (web)</option>
          <option value="inventory">Inventory (web)</option>
          <option value="customer">Customer (web)</option>
          <option value="mobile">Mobile</option>
        </select>
        <input
          value={filter.search}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          placeholder="Search message or route"
          style={{ ...selStyle, flex: 1, minWidth: 240 }}
        />
        <label
          style={{ fontSize: 12, color: "#6B6A85", display: "flex", gap: 6, alignItems: "center" }}
        >
          <input
            type="checkbox"
            checked={filter.unresolvedOnly}
            onChange={(e) => setFilter((f) => ({ ...f, unresolvedOnly: e.target.checked }))}
          />
          Unresolved only
        </label>
      </div>

      {/* List */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {items.length === 0 && !q.isLoading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#6B6A85", fontSize: 14 }}>
            🎉 No matching errors. The system is clean.
          </div>
        ) : null}

        {items.map((row) => (
          <details
            key={row.id}
            style={{
              borderTop: "1px solid #F4F4F7",
              padding: "14px 16px",
              background: row.resolvedAt ? "#FAFAFC" : "#fff",
              opacity: row.resolvedAt ? 0.7 : 1,
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "70px 90px 1fr 160px 130px 90px",
                alignItems: "center",
                gap: 10,
                listStyle: "none",
                userSelect: "none",
              }}
            >
              <span
                style={{
                  background: LEVEL_STYLES[row.level]?.bg ?? "#999",
                  color: LEVEL_STYLES[row.level]?.fg ?? "#fff",
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  textAlign: "center",
                }}
              >
                {row.level}
              </span>
              <span
                style={{
                  background: SOURCE_STYLES[row.source] ?? "#666",
                  color: "#fff",
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                {row.source}
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.message}
              </span>
              <span style={{ fontSize: 11, color: "#6B6A85", fontFamily: "monospace" }}>
                {row.method ?? "—"} {row.route ?? ""}
                {row.statusCode ? ` · ${row.statusCode}` : ""}
              </span>
              <span style={{ fontSize: 11, color: "#6B6A85" }}>
                {new Date(row.createdAt).toLocaleString()}
              </span>
              {!row.resolvedAt ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    resolveMutation.mutate(row.id);
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: "1px solid #A9F453",
                    background: "#fff",
                    color: "#1F6E00",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  Resolve
                </button>
              ) : (
                <span style={{ fontSize: 11, color: "#1F6E00" }}>✓ resolved</span>
              )}
            </summary>
            <div style={{ marginTop: 12, fontSize: 12, color: "#02011F" }}>
              <Field label="User" value={row.userId ?? "anonymous"} />
              <Field label="Request ID" value={row.requestId ?? "—"} />
              <Field label="IP" value={row.ipAddress ?? "—"} />
              <Field label="User-Agent" value={row.userAgent ?? "—"} />
              {row.metadata ? (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", color: "#6B6A85", fontSize: 11 }}>
                    Metadata
                  </summary>
                  <pre style={preStyle}>{JSON.stringify(row.metadata, null, 2)}</pre>
                </details>
              ) : null}
              {row.stack ? (
                <details open style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", color: "#6B6A85", fontSize: 11 }}>
                    Stack trace
                  </summary>
                  <pre style={{ ...preStyle, color: "#FF0000" }}>{row.stack}</pre>
                </details>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}): JSX.Element {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ECECF1",
        borderRadius: 12,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span style={{ fontSize: 10, color: "#6B6A85", letterSpacing: 0.6, fontWeight: 700 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 36,
          color: value > 0 ? color : "#02011F",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#6B6A85" }}>
      <span style={{ width: 90, fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: "monospace", color: "#02011F" }}>{value}</span>
    </div>
  );
}

const selStyle: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #ECECF1",
  borderRadius: 10,
  fontSize: 13,
  background: "#fff",
  fontFamily: "inherit",
};

const preStyle: React.CSSProperties = {
  fontSize: 11,
  background: "#F7F7FB",
  padding: 12,
  borderRadius: 6,
  overflow: "auto",
  maxHeight: 320,
  marginTop: 6,
  fontFamily: "monospace",
};
