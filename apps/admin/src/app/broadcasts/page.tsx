"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface Broadcast {
  id: string;
  title: string;
  bodyMd: string;
  audience: string;
  channels: string[];
  scheduledAt: string | null;
  sentAt: string | null;
  sentCount: number;
}

export default function BroadcastsPage(): JSX.Element {
  const qc = useQueryClient();
  const q = useQuery<{ data: Broadcast[] }>({
    queryKey: ["broadcasts"],
    queryFn: () => authedFetch("/api/admin/broadcasts"),
  });
  const [draft, setDraft] = useState({
    title: "",
    bodyMd: "",
    audience: "all",
    channels: ["push"] as string[],
  });

  const create = useMutation({
    mutationFn: (body: typeof draft) =>
      authedFetch("/api/admin/broadcasts", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setDraft({ title: "", bodyMd: "", audience: "all", channels: ["push"] });
      void qc.invalidateQueries({ queryKey: ["broadcasts"] });
    },
  });

  const send = useMutation({
    mutationFn: (id: string) =>
      authedFetch(`/api/admin/broadcasts/${id}/send-now`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["broadcasts"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => authedFetch(`/api/admin/broadcasts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["broadcasts"] }),
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
          BROADCASTS
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
            margin: "4px 0 0",
            textTransform: "uppercase",
          }}
        >
          Reach everyone<span style={{ color: colors.brand.trendyPink }}>.</span>
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
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Title"
          style={inp}
        />
        <textarea
          value={draft.bodyMd}
          onChange={(e) => setDraft({ ...draft, bodyMd: e.target.value })}
          placeholder="Message body (markdown ok)"
          rows={4}
          style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={draft.audience}
            onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
            style={{ ...inp, flex: 1 }}
          >
            <option value="all">Everyone</option>
            <option value="customers">Customers only</option>
            <option value="staff">Staff only</option>
            <option value="tier:gold">Gold tier</option>
            <option value="tier:platinum">Platinum tier</option>
          </select>
          <button
            onClick={() => create.mutate(draft)}
            disabled={!draft.title || !draft.bodyMd || create.isPending}
            style={primaryBtn}
          >
            {create.isPending ? "Saving…" : "Save draft"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((b) => (
          <div
            key={b.id}
            style={{
              background: "#fff",
              border: "1px solid #ECECF1",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.brand.trustWorth }}>
                {b.title}
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: b.sentAt ? `${colors.brand.ecoLimelight}33` : "#F4F4F7",
                  color: b.sentAt ? "#3F7B0E" : "#6B6A85",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {b.sentAt ? `Sent · ${b.sentCount}` : "Draft"}
              </span>
              <span style={{ fontSize: 11, color: "#6B6A85" }}>· {b.audience}</span>
              <div style={{ flex: 1 }} />
              {!b.sentAt ? (
                <button
                  onClick={() => send.mutate(b.id)}
                  disabled={send.isPending}
                  style={{ ...primaryBtn, padding: "6px 14px" }}
                >
                  Send now
                </button>
              ) : null}
              <button
                onClick={() => {
                  if (confirm("Delete?")) remove.mutate(b.id);
                }}
                style={{ ...secondaryBtn, color: colors.brand.ultraRed }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 12, color: "#6B6A85", marginTop: 8, whiteSpace: "pre-wrap" }}>
              {b.bodyMd}
            </p>
          </div>
        ))}
        {items.length === 0 ? (
          <div style={{ color: "#6B6A85", fontSize: 13 }}>No broadcasts yet.</div>
        ) : null}
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
  padding: "10px 18px",
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
const secondaryBtn: React.CSSProperties = {
  padding: "4px 10px",
  border: "1px solid #ECECF1",
  borderRadius: 8,
  background: "#fff",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};
