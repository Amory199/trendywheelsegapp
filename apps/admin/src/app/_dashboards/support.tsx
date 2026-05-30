"use client";

import { useQuery } from "@tanstack/react-query";
import { twPalette } from "@trendywheels/ui-tokens";
import Link from "next/link";
import * as React from "react";

import { DashboardChrome, StatCard, authedJson } from "./shared";

interface ListEnvelope<T> {
  data: T[];
  total?: number;
}

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  priority?: string;
  createdAt: string;
  user?: { name?: string };
}

interface MessageRow {
  id: string;
  body: string;
  createdAt: string;
  fromUser?: { name?: string };
}

// Support workspace. Surfaces: open ticket count by priority, unread message
// count, recent ticket queue, recent messages. Quick actions point at the
// most-used create/inbox surfaces.
export function SupportDashboard(): React.JSX.Element {
  const palette = twPalette(false);

  const ticketsQ = useQuery({
    queryKey: ["dash", "support", "tickets"],
    queryFn: () =>
      authedJson<ListEnvelope<TicketRow>>("/api/tickets?limit=10").catch(() => ({ data: [] })),
  });
  const messagesQ = useQuery({
    queryKey: ["dash", "support", "messages"],
    queryFn: () =>
      authedJson<ListEnvelope<MessageRow>>("/api/messages?limit=10").catch(() => ({ data: [] })),
  });

  const open = (ticketsQ.data?.data ?? []).filter(
    (t) => t.status !== "closed" && t.status !== "resolved",
  );
  const highPriority = open.filter((t) => t.priority === "high" || t.priority === "urgent");

  return (
    <DashboardChrome
      pageKey="admin:dashboard"
      title="Support workspace"
      subtitle="Tickets, messages, and customers that need a response today."
      quickActions={[
        { label: "+ New ticket", href: "/tickets", tone: "primary" },
        { label: "Knowledge base", href: "/kb", tone: "secondary" },
      ]}
      stats={
        <>
          <StatCard
            label="Open tickets"
            value={ticketsQ.isLoading ? "…" : open.length}
            loading={ticketsQ.isLoading}
            onClick={() => (window.location.href = "/tickets")}
          />
          <StatCard
            label="Priority"
            value={ticketsQ.isLoading ? "…" : highPriority.length}
            loading={ticketsQ.isLoading}
            tone="danger"
            onClick={() => (window.location.href = "/tickets")}
          />
          <StatCard
            label="Recent messages"
            value={messagesQ.isLoading ? "…" : (messagesQ.data?.data.length ?? 0)}
            loading={messagesQ.isLoading}
            tone="accent"
            onClick={() => (window.location.href = "/messages")}
          />
          <StatCard label="Avg response" value="—" hint="coming soon" />
        </>
      }
      lists={
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div
            style={{
              background: palette.card,
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: palette.text, marginBottom: 10 }}>
              Open tickets
            </div>
            {open.length === 0 ? (
              <div style={{ fontSize: 13, color: palette.muted, padding: "12px 0" }}>
                Inbox zero.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {open.slice(0, 6).map((t, idx) => (
                  <Link
                    key={t.id}
                    href={`/tickets/${t.id}`}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "8px 0",
                      textDecoration: "none",
                      borderTop: idx === 0 ? "none" : `1px solid ${palette.hairline}`,
                      fontSize: 13,
                      color: palette.text,
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.subject}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 6,
                        textTransform: "uppercase",
                        background:
                          t.priority === "urgent" || t.priority === "high"
                            ? "rgba(220,38,38,0.12)"
                            : "rgba(43,15,248,0.1)",
                        color:
                          t.priority === "urgent" || t.priority === "high" ? "#DC2626" : "#2B0FF8",
                      }}
                    >
                      {t.priority ?? t.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div
            style={{
              background: palette.card,
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: palette.text, marginBottom: 10 }}>
              Recent messages
            </div>
            {(messagesQ.data?.data ?? []).length === 0 ? (
              <div style={{ fontSize: 13, color: palette.muted, padding: "12px 0" }}>
                No new messages.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {(messagesQ.data?.data ?? []).slice(0, 6).map((m, idx) => (
                  <Link
                    key={m.id}
                    href={`/messages`}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "8px 0",
                      textDecoration: "none",
                      borderTop: idx === 0 ? "none" : `1px solid ${palette.hairline}`,
                      fontSize: 13,
                      color: palette.text,
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.fromUser?.name ?? "Customer"} — {m.body?.slice(0, 50)}
                    </span>
                    <span style={{ fontSize: 11, color: palette.muted }}>
                      {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}
