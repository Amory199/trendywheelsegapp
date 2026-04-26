"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { useState } from "react";

import { authedFetch } from "../../../lib/fetcher";

interface Lead {
  id: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  status: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  estimatedValue: string | number;
  source: string;
  ownerId: string | null;
  claimDeadline: string | null;
  lastActivityAt: string;
  owner: { id: string; name: string } | null;
  customer: { id: string; name: string; phone?: string; email?: string | null } | null;
  _count: { activities: number };
}

const COLUMNS: Array<{ status: Lead["status"]; label: string; color: string }> = [
  { status: "new", label: "New", color: colors.brand.poolBlue },
  { status: "contacted", label: "Contacted", color: "#7C7BFF" },
  { status: "qualified", label: "Qualified", color: colors.brand.friendlyBlue },
  { status: "proposal", label: "Proposal", color: colors.brand.trendyPink },
  { status: "won", label: "Won", color: colors.brand.ecoLimelight },
  { status: "lost", label: "Lost", color: "#9E9DAE" },
];

export default function LeadsBoardPage(): JSX.Element {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "mine" | "unassigned">("all");

  const q = useQuery<{ data: Lead[] }>({
    queryKey: ["crm-leads", filter],
    queryFn: () =>
      authedFetch(
        filter === "mine"
          ? "/api/crm/leads?mine=1"
          : filter === "unassigned"
            ? "/api/crm/leads?ownerId=unassigned"
            : "/api/crm/leads",
      ),
  });

  const claim = useMutation({
    mutationFn: (id: string) => authedFetch(`/api/crm/leads/${id}/claim`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-leads"] }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Lead["status"] }) =>
      authedFetch(`/api/crm/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-leads"] }),
  });

  const leads = q.data?.data ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.brand.trendyPink, letterSpacing: "0.12em" }}>LEAD BOARD</span>
          <h1 style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 36, margin: "4px 0 0", textTransform: "uppercase" }}>
            Leads<span style={{ color: colors.brand.trendyPink }}>.</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6, padding: 4, background: "#fff", border: "1px solid #ECECF1", borderRadius: 12 }}>
          {(["all", "mine", "unassigned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="tw-press"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: filter === f ? colors.brand.friendlyBlue : "transparent",
                color: filter === f ? "#fff" : "#4B4A6B",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                cursor: "pointer",
              }}
            >
              {f === "all" ? "All leads" : f === "mine" ? "My leads" : "Unassigned"}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(220px, 1fr))",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {COLUMNS.map((col) => {
          const items = leads.filter((l) => l.status === col.status);
          const value = items.reduce((acc, l) => acc + Number(l.estimatedValue), 0);
          return (
            <div key={col.status} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #ECECF1",
                  borderTop: `3px solid ${col.color}`,
                  borderRadius: 10,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#4B4A6B", letterSpacing: "0.06em", textTransform: "uppercase", flex: 1 }}>
                  {col.label}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6B6A85" }}>{items.length}</span>
              </div>
              <div className="tw-stagger" style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                {items.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClaim={() => claim.mutate(lead.id)}
                    onAdvance={(status) => setStatus.mutate({ id: lead.id, status })}
                  />
                ))}
              </div>
              {value > 0 ? (
                <div style={{ fontSize: 11, color: "#6B6A85", textAlign: "right", padding: "0 4px" }}>
                  EGP {Math.round(value).toLocaleString()}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  onClaim,
  onAdvance,
}: {
  lead: Lead;
  onClaim: () => void;
  onAdvance: (s: Lead["status"]) => void;
}): JSX.Element {
  const ttl = lead.claimDeadline ? new Date(lead.claimDeadline).getTime() - Date.now() : null;
  const ttlMins = ttl !== null ? Math.max(0, Math.floor(ttl / 60000)) : null;
  const overdue = ttl !== null && ttl < 0;
  const next: Record<Lead["status"], Lead["status"] | null> = {
    new: "contacted",
    contacted: "qualified",
    qualified: "proposal",
    proposal: "won",
    won: null,
    lost: null,
  };
  const nextStatus = next[lead.status];

  return (
    <div
      className="tw-card-lift"
      style={{
        background: "#fff",
        border: `1px solid ${overdue ? colors.brand.ultraRed : "#ECECF1"}`,
        borderRadius: 12,
        padding: 12,
        position: "relative",
      }}
    >
      <Link
        href={`/crm/leads/${lead.id}`}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.brand.trustWorth, marginBottom: 4 }}>
          {lead.contactName}
        </div>
        <div style={{ fontSize: 11, color: "#6B6A85", marginBottom: 8 }}>
          {lead.contactPhone ?? lead.contactEmail ?? "No contact info"}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: colors.brand.trustWorth }}>
            EGP {Math.round(Number(lead.estimatedValue)).toLocaleString()}
          </span>
          {ttlMins !== null && lead.ownerId ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: overdue ? colors.brand.ultraRed : "#6B6A85",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {overdue ? "Overdue!" : `${ttlMins}m left`}
            </span>
          ) : null}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "#6B6A85", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: lead.ownerId ? colors.brand.ecoLimelight : colors.brand.trendyPink, display: "inline-block" }} />
          {lead.owner?.name ?? "Unassigned"} · {lead._count.activities} acts
        </div>
      </Link>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {!lead.ownerId ? (
          <button
            onClick={onClaim}
            className="tw-press"
            style={{ flex: 1, padding: "6px 10px", border: "none", borderRadius: 8, background: colors.brand.friendlyBlue, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase" }}
          >
            Claim →
          </button>
        ) : nextStatus ? (
          <button
            onClick={() => onAdvance(nextStatus)}
            className="tw-press"
            style={{ flex: 1, padding: "6px 10px", border: `1px solid ${colors.brand.friendlyBlue}`, borderRadius: 8, background: "transparent", color: colors.brand.friendlyBlue, fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase" }}
          >
            → {nextStatus}
          </button>
        ) : null}
        {lead.ownerId && lead.status !== "lost" && lead.status !== "won" ? (
          <button
            onClick={() => onAdvance("lost")}
            className="tw-press"
            style={{ padding: "6px 10px", border: "1px solid #ECECF1", borderRadius: 8, background: "#fff", color: "#9E9DAE", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}
