"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface Flag {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
}

export default function FeatureFlagsPage(): JSX.Element {
  const qc = useQueryClient();
  const q = useQuery<{ data: Flag[] }>({
    queryKey: ["flags"],
    queryFn: () => authedFetch("/api/admin/feature-flags"),
  });
  const [draft, setDraft] = useState({ key: "", description: "" });

  const toggle = useMutation({
    mutationFn: ({
      key,
      enabled,
      description,
    }: {
      key: string;
      enabled: boolean;
      description?: string;
    }) =>
      authedFetch(`/api/admin/feature-flags/${key}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled, description }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flags"] }),
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
          FEATURE FLAGS
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
            margin: "4px 0 0",
            textTransform: "uppercase",
          }}
        >
          Toggle modules<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 14,
          padding: 14,
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={draft.key}
          onChange={(e) => setDraft({ ...draft, key: e.target.value })}
          placeholder="flag.key"
          style={inp}
        />
        <input
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="What does this flag control?"
          style={{ ...inp, flex: 2 }}
        />
        <button
          onClick={() => {
            if (!draft.key) return;
            toggle.mutate({ key: draft.key, enabled: false, description: draft.description });
            setDraft({ key: "", description: "" });
          }}
          style={primaryBtn}
        >
          Add flag
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((f) => (
          <div
            key={f.id}
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
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 14,
                  fontWeight: 700,
                  color: colors.brand.trustWorth,
                }}
              >
                {f.key}
              </div>
              {f.description ? (
                <div style={{ fontSize: 11, color: "#6B6A85", marginTop: 2 }}>{f.description}</div>
              ) : null}
            </div>
            <button
              onClick={() => toggle.mutate({ key: f.key, enabled: !f.enabled })}
              style={{
                width: 56,
                height: 30,
                borderRadius: 15,
                border: "none",
                background: f.enabled ? colors.brand.ecoLimelight : "#ECECF1",
                position: "relative",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: f.enabled ? 29 : 3,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                  transition: "left 180ms cubic-bezier(.2,.7,.3,1)",
                }}
              />
            </button>
          </div>
        ))}
        {items.length === 0 ? (
          <div style={{ color: "#6B6A85", fontSize: 13 }}>No flags yet.</div>
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
  flex: 1,
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
