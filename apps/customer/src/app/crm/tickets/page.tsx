"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";

import { ACCESS_KEY, baseUrl, readToken } from "../../../lib/api";

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

interface Ticket {
  id: string;
  subject: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  user: { id: string; name: string | null; email: string | null } | null;
  assignedAgent: { id: string; name: string | null } | null;
}

const STATUS_TONE: Record<Ticket["status"], { bg: string; fg: string }> = {
  open: { bg: "#FFE4E1", fg: "#FF0065" },
  pending: { bg: "#FFF3D6", fg: "#A87800" },
  resolved: { bg: "#D6F5DC", fg: "#1F6E00" },
  closed: { bg: "#E5E7EB", fg: "#6B6A85" },
};

const PRIORITY_DOT: Record<Ticket["priority"], string> = {
  low: "#A1A1AA",
  normal: colors.brand.poolBlue,
  high: "#F5B800",
  urgent: colors.brand.trendyPink,
};

export default function CrmTicketsPage(): JSX.Element {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<Ticket | null>(null);

  const q = useQuery<{ data: Ticket[] }>({
    queryKey: ["crm-tickets", statusFilter],
    queryFn: () =>
      authedFetch<{ data: Ticket[] }>(
        `/api/tickets${statusFilter ? `?status=${statusFilter}` : ""}`,
      ),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; status: Ticket["status"] }) =>
      authedFetch(`/api/tickets/${input.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: input.status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-tickets"] }),
  });

  const items = q.data?.data ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <header>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.brand.trendyPink,
            letterSpacing: "0.12em",
          }}
        >
          SUPPORT TICKETS
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 30,
            margin: "4px 0 0",
            textTransform: "uppercase",
            color: colors.brand.trustWorth,
          }}
        >
          Help comes first<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
        <p style={{ color: "#6B6A85", marginTop: 4, fontSize: 13 }}>
          {items.length} {statusFilter || "all"} tickets · click a row to update
        </p>
      </header>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["", "open", "pending", "resolved", "closed"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: `1px solid ${statusFilter === s ? colors.brand.friendlyBlue : "#E2E2E9"}`,
              background: statusFilter === s ? colors.brand.friendlyBlue : "#fff",
              color: statusFilter === s ? "#fff" : "#02011F",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {q.isLoading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#6B6A85" }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#6B6A85" }}>
            No tickets match.
          </div>
        ) : (
          items.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "20px 1fr 200px 120px 120px",
                gap: 12,
                alignItems: "center",
                padding: "14px 18px",
                borderTop: "1px solid #F4F4F7",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: PRIORITY_DOT[t.priority],
                }}
              />
              <span style={{ fontWeight: 600, fontSize: 14, color: "#02011F" }}>{t.subject}</span>
              <span style={{ fontSize: 12, color: "#6B6A85" }}>
                {t.user?.name ?? t.user?.email ?? "—"}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: STATUS_TONE[t.status].bg,
                  color: STATUS_TONE[t.status].fg,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  textAlign: "center",
                }}
              >
                {t.status}
              </span>
              <span style={{ fontSize: 12, color: "#6B6A85" }}>
                {new Date(t.createdAt).toLocaleDateString()}
              </span>
            </button>
          ))
        )}
      </div>

      {selected ? (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,1,31,0.5)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 480,
              background: "#fff",
              padding: 28,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <header>
              <span style={{ fontSize: 11, color: "#6B6A85", letterSpacing: 0.5 }}>
                #{selected.id.slice(0, 8)}
              </span>
              <h2 style={{ margin: "4px 0 0", fontSize: 20 }}>{selected.subject}</h2>
              <p style={{ marginTop: 4, color: "#6B6A85", fontSize: 13 }}>
                Customer: {selected.user?.name ?? "—"} ({selected.user?.email ?? "no email"})
              </p>
            </header>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["open", "pending", "resolved", "closed"] as Ticket["status"][]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    updateMutation.mutate({ id: selected.id, status: s });
                    setSelected({ ...selected, status: s });
                  }}
                  disabled={updateMutation.isPending}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid",
                    borderColor: selected.status === s ? colors.brand.friendlyBlue : "#E2E2E9",
                    background: selected.status === s ? colors.brand.friendlyBlue : "#fff",
                    color: selected.status === s ? "#fff" : "#02011F",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "#6B6A85", lineHeight: 1.6 }}>
              <strong style={{ color: "#02011F" }}>Priority:</strong> {selected.priority}
              <br />
              <strong style={{ color: "#02011F" }}>Assigned to:</strong>{" "}
              {selected.assignedAgent?.name ?? "Unassigned"}
              <br />
              <strong style={{ color: "#02011F" }}>Created:</strong>{" "}
              {new Date(selected.createdAt).toLocaleString()}
            </div>

            <button
              onClick={() => setSelected(null)}
              style={{
                marginTop: "auto",
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #E2E2E9",
                background: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
