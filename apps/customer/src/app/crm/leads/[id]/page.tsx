"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { authedFetch } from "../../../../lib/fetcher";

interface LeadDetail {
  id: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  status: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  estimatedValue: string | number;
  source: string;
  ownerId: string | null;
  notes: string | null;
  claimDeadline: string | null;
  lastActivityAt: string;
  reassignmentCount: number;
  createdAt: string;
  owner: { id: string; name: string; email: string; staffRole: string | null } | null;
  customer: { id: string; name: string; phone: string; email: string | null; loyaltyTier: string; createdAt: string } | null;
  activities: Array<{
    id: string;
    type: string;
    body: string;
    createdAt: string;
    actor: { id: string; name: string } | null;
  }>;
}

const STATUSES: LeadDetail["status"][] = ["new", "contacted", "qualified", "proposal", "won", "lost"];

const STATUS_COLOR: Record<string, string> = {
  new: colors.brand.poolBlue,
  contacted: "#7C7BFF",
  qualified: colors.brand.friendlyBlue,
  proposal: colors.brand.trendyPink,
  won: colors.brand.ecoLimelight,
  lost: "#9E9DAE",
};

const ACTIVITY_ICON: Record<string, string> = {
  created: "✨",
  assigned: "📌",
  reassigned: "♻️",
  "status-change": "→",
  note: "📝",
  call: "📞",
  email: "✉️",
  won: "🎉",
  lost: "💔",
};

export default function LeadDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [activityType, setActivityType] = useState<"note" | "call" | "email">("note");
  const [activityBody, setActivityBody] = useState("");

  const q = useQuery<{ data: LeadDetail }>({
    queryKey: ["crm-lead", id],
    queryFn: () => authedFetch(`/api/crm/leads/${id}`),
    enabled: !!id,
  });

  const lead = q.data?.data;

  const setStatus = useMutation({
    mutationFn: (status: LeadDetail["status"]) =>
      authedFetch(`/api/crm/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-lead", id] }),
  });

  const claim = useMutation({
    mutationFn: () => authedFetch(`/api/crm/leads/${id}/claim`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-lead", id] }),
  });

  const addActivity = useMutation({
    mutationFn: (body: { type: string; body: string }) =>
      authedFetch(`/api/crm/leads/${id}/activities`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setActivityBody("");
      void qc.invalidateQueries({ queryKey: ["crm-lead", id] });
    },
  });

  if (q.isLoading) return <div style={{ color: "#6B6A85" }}>Loading lead…</div>;
  if (!lead) return <div>Lead not found.</div>;

  const ttlMs = lead.claimDeadline ? new Date(lead.claimDeadline).getTime() - Date.now() : null;
  const ttlMins = ttlMs !== null ? Math.max(0, Math.floor(ttlMs / 60000)) : null;
  const overdue = ttlMs !== null && ttlMs < 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, 380px)", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Link href="/crm/leads" style={{ fontSize: 12, color: colors.brand.friendlyBlue, fontWeight: 700, textDecoration: "none" }}>
          ← back to board
        </Link>

        <div style={{ background: "#fff", border: "1px solid #ECECF1", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: 6, background: STATUS_COLOR[lead.status] }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: STATUS_COLOR[lead.status] }}>
              {lead.status} · {lead.source}
            </span>
            {overdue ? <span className="tw-pulse" style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 999, background: colors.brand.ultraRed, color: "#fff", fontSize: 10, fontWeight: 700 }}>OVERDUE</span> : null}
          </div>
          <h1 style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 40, margin: 0, textTransform: "uppercase" }}>
            {lead.contactName}
          </h1>
          <div style={{ display: "flex", gap: 16, marginTop: 12, color: "#6B6A85", fontSize: 13, flexWrap: "wrap" }}>
            {lead.contactPhone ? <span>📞 {lead.contactPhone}</span> : null}
            {lead.contactEmail ? <span>✉️ {lead.contactEmail}</span> : null}
            <span>EGP {Math.round(Number(lead.estimatedValue)).toLocaleString()}</span>
            {ttlMins !== null && lead.ownerId ? (
              <span style={{ color: overdue ? colors.brand.ultraRed : "#6B6A85" }}>
                ⏱ {overdue ? "deadline passed" : `${ttlMins}m to claim`}
              </span>
            ) : null}
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus.mutate(s)}
                disabled={s === lead.status || setStatus.isPending}
                className="tw-press"
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${s === lead.status ? STATUS_COLOR[s] : "#ECECF1"}`,
                  background: s === lead.status ? STATUS_COLOR[s] : "transparent",
                  color: s === lead.status ? (s === "won" ? "#02011F" : "#fff") : "#4B4A6B",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  cursor: s === lead.status ? "default" : "pointer",
                }}
              >
                {s}
              </button>
            ))}
            {!lead.ownerId ? (
              <button
                onClick={() => claim.mutate()}
                className="tw-press"
                style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: colors.brand.friendlyBlue, color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", letterSpacing: "0.06em" }}
              >
                Claim
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #ECECF1", borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 14 }}>Log activity</h2>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {(["note", "call", "email"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActivityType(t)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: `1px solid ${activityType === t ? colors.brand.friendlyBlue : "#ECECF1"}`,
                  background: activityType === t ? colors.brand.friendlyBlue : "#fff",
                  color: activityType === t ? "#fff" : "#4B4A6B",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <textarea
            value={activityBody}
            onChange={(e) => setActivityBody(e.target.value)}
            placeholder={
              activityType === "call"
                ? "What did you discuss on the call?"
                : activityType === "email"
                  ? "Subject + summary…"
                  : "Quick note…"
            }
            style={{ width: "100%", minHeight: 80, border: "1px solid #ECECF1", borderRadius: 10, padding: 12, fontFamily: "inherit", fontSize: 13, resize: "vertical" }}
          />
          <button
            disabled={!activityBody.trim() || addActivity.isPending}
            onClick={() => addActivity.mutate({ type: activityType, body: activityBody.trim() })}
            className="tw-press"
            style={{ marginTop: 10, padding: "10px 16px", borderRadius: 10, border: "none", background: colors.brand.friendlyBlue, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !activityBody.trim() ? 0.5 : 1 }}
          >
            {addActivity.isPending ? "Saving…" : "Log activity →"}
          </button>
        </div>

        <div style={{ background: "#fff", border: "1px solid #ECECF1", borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 14 }}>Activity timeline</h2>
          <div className="tw-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {lead.activities.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: "#F4F4F7", display: "grid", placeItems: "center", flexShrink: 0, fontSize: 14 }}>
                  {ACTIVITY_ICON[a.type] ?? "•"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: colors.brand.trustWorth }}>{a.body}</div>
                  <div style={{ fontSize: 11, color: "#6B6A85", marginTop: 2 }}>
                    {a.actor?.name ?? "system"} · {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SidePanel title="Owner">
          {lead.owner ? (
            <>
              <div style={{ fontWeight: 700 }}>{lead.owner.name}</div>
              <div style={{ fontSize: 12, color: "#6B6A85" }}>{lead.owner.email}</div>
              <div style={{ fontSize: 11, color: "#6B6A85", marginTop: 4 }}>{lead.owner.staffRole ?? "staff"}</div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "#6B6A85" }}>Unassigned · waiting for round-robin</div>
          )}
        </SidePanel>

        {lead.customer ? (
          <SidePanel title="Customer">
            <div style={{ fontWeight: 700 }}>{lead.customer.name}</div>
            <div style={{ fontSize: 12, color: "#6B6A85" }}>{lead.customer.phone}</div>
            {lead.customer.email ? <div style={{ fontSize: 12, color: "#6B6A85" }}>{lead.customer.email}</div> : null}
            <div style={{ fontSize: 11, color: "#6B6A85", marginTop: 6, textTransform: "capitalize" }}>
              {lead.customer.loyaltyTier} · joined {new Date(lead.customer.createdAt).toLocaleDateString()}
            </div>
          </SidePanel>
        ) : null}

        <SidePanel title="Lead facts">
          <Row label="Source" value={lead.source} />
          <Row label="Created" value={new Date(lead.createdAt).toLocaleDateString()} />
          <Row label="Last activity" value={new Date(lead.lastActivityAt).toLocaleString()} />
          <Row label="Reassignments" value={String(lead.reassignmentCount)} />
        </SidePanel>
      </aside>
    </div>
  );
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ background: "#fff", border: "1px solid #ECECF1", borderRadius: 14, padding: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6B6A85", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", color: "#4B4A6B" }}>
      <span style={{ color: "#6B6A85" }}>{label}</span>
      <span style={{ fontWeight: 700, textTransform: "capitalize" }}>{value}</span>
    </div>
  );
}
