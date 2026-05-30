"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useEffect, useState } from "react";
import type { JSX } from "react";

import { useAuth } from "../../../lib/auth-store";
import { authedFetch } from "../../../lib/fetcher";

// Notification preferences. Persists via PUT /api/users/:id with
// preferences: { ... }. Same prefs flag set the mobile server reads when
// deciding whether to dispatch a push (see apps/api/src/workers/index.ts
// shouldSkipForPrefs).

interface Prefs {
  emailMarketing?: boolean;
  pushBookings?: boolean;
  pushRepairs?: boolean;
  pushMessages?: boolean;
  pushSales?: boolean;
}

const TOGGLES: Array<{ key: keyof Prefs; label: string; sub: string }> = [
  {
    key: "pushBookings",
    label: "Bookings & approvals",
    sub: "Push when your booking is approved, rejected, or completed.",
  },
  {
    key: "pushRepairs",
    label: "Repair status",
    sub: "Push when a repair request changes status.",
  },
  {
    key: "pushSales",
    label: "Sales listings",
    sub: "Push when your listing is approved or sells.",
  },
  {
    key: "pushMessages",
    label: "Messages",
    sub: "Push when a team member messages you.",
  },
  {
    key: "emailMarketing",
    label: "Promo emails",
    sub: "Occasional emails about new vehicles and discounts.",
  },
];

export default function NotificationsPage(): JSX.Element {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Prefs>({});

  useEffect(() => {
    if (user?.preferences) setDraft(user.preferences as Prefs);
  }, [user]);

  const save = useMutation({
    mutationFn: (next: Prefs) =>
      authedFetch(`/api/users/${user?.id}`, {
        method: "PUT",
        body: JSON.stringify({ preferences: next }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  if (!user) return <div style={{ padding: 24 }}>Sign in to manage notifications.</div>;

  const onToggle = (k: keyof Prefs): void => {
    const next = { ...draft, [k]: !draft[k] };
    setDraft(next);
    save.mutate(next);
  };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 720, margin: "0 auto", padding: "8px 0" }}>
      <h1
        style={{
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: "clamp(2rem, 7vw, 3rem)",
          textTransform: "uppercase",
          margin: 0,
          color: colors.brand.trustWorth,
        }}
      >
        Notifications<span style={{ color: colors.brand.trendyPink }}>.</span>
      </h1>
      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {TOGGLES.map((t, i) => (
          <div
            key={t.key}
            style={{
              padding: 16,
              borderBottom: i < TOGGLES.length - 1 ? "1px solid #ECECF1" : "none",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1933" }}>{t.label}</div>
              <div style={{ fontSize: 13, color: "#6B6A85", marginTop: 2 }}>{t.sub}</div>
            </div>
            <Switch on={!!draft[t.key]} onChange={() => onToggle(t.key)} />
          </div>
        ))}
      </div>
      {save.isError ? (
        <div style={{ fontSize: 12, color: colors.brand.ultraRed ?? "#D43F3F" }}>
          Couldn’t save — try again.
        </div>
      ) : null}
    </div>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: () => void }): JSX.Element {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        border: "none",
        background: on ? colors.brand.friendlyBlue : "#D8D8DE",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      aria-pressed={on}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: 10,
          background: "#fff",
          transition: "left 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}
