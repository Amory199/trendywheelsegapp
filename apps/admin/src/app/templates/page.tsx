"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface Template {
  id: string;
  key: string;
  channel: "push" | "email" | "sms";
  subject: string | null;
  bodyMd: string;
  variables: Array<{ name: string; description?: string }>;
  active: boolean;
}

export default function TemplatesPage(): JSX.Element {
  const qc = useQueryClient();
  const q = useQuery<{ data: Template[] }>({
    queryKey: ["templates"],
    queryFn: () => authedFetch("/api/admin/templates"),
  });
  const [draft, setDraft] = useState<{
    key: string;
    channel: "push" | "email" | "sms";
    subject: string;
    bodyMd: string;
  }>({ key: "", channel: "push", subject: "", bodyMd: "" });

  const create = useMutation({
    mutationFn: () =>
      authedFetch("/api/admin/templates", {
        method: "POST",
        body: JSON.stringify({ ...draft, variables: [] }),
      }),
    onSuccess: () => {
      setDraft({ key: "", channel: "push", subject: "", bodyMd: "" });
      void qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => authedFetch(`/api/admin/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
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
          NOTIFICATION TEMPLATES
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
            margin: "4px 0 0",
            textTransform: "uppercase",
          }}
        >
          Message library<span style={{ color: colors.brand.trendyPink }}>.</span>
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
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={draft.key}
            onChange={(e) => setDraft({ ...draft, key: e.target.value })}
            placeholder="key (e.g. booking_confirmed)"
            style={inp}
          />
          <select
            value={draft.channel}
            onChange={(e) => setDraft({ ...draft, channel: e.target.value as never })}
            style={inp}
          >
            <option value="push">Push</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </div>
        {draft.channel === "email" ? (
          <input
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            placeholder="Subject"
            style={inp}
          />
        ) : null}
        <textarea
          value={draft.bodyMd}
          onChange={(e) => setDraft({ ...draft, bodyMd: e.target.value })}
          placeholder="Body. Use {{variableName}} for substitution."
          rows={4}
          style={{ ...inp, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
        />
        <button
          onClick={() => create.mutate()}
          disabled={!draft.key || !draft.bodyMd || create.isPending}
          style={primaryBtn}
        >
          {create.isPending ? "Saving…" : "Add template"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(q.data?.data ?? []).map((t) => (
          <div
            key={t.id}
            style={{
              background: "#fff",
              border: "1px solid #ECECF1",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <code style={{ fontSize: 13, color: colors.brand.friendlyBlue, fontWeight: 700 }}>
                {t.key}
              </code>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "#F4F4F7",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontWeight: 700,
                  color: "#6B6A85",
                }}
              >
                {t.channel}
              </span>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => {
                  if (confirm(`Delete ${t.key}?`)) remove.mutate(t.id);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.brand.ultraRed,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                ✕
              </button>
            </div>
            {t.subject ? (
              <div style={{ fontSize: 12, color: "#6B6A85", marginTop: 4 }}>
                Subject: {t.subject}
              </div>
            ) : null}
            <pre
              style={{
                fontSize: 11,
                marginTop: 6,
                background: "#F7F7FB",
                padding: 10,
                borderRadius: 6,
                whiteSpace: "pre-wrap",
              }}
            >
              {t.bodyMd}
            </pre>
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
  flex: 1,
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
  alignSelf: "flex-start",
};
