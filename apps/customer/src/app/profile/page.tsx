"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useEffect, useState } from "react";

import { useAuth } from "../../lib/auth-store";
import { authedFetch } from "../../lib/fetcher";

export default function ProfilePage(): JSX.Element {
  const { user, hydrate } = useAuth();
  const qc = useQueryClient();

  const [draft, setDraft] = useState({ name: "", email: "", phone: "", licenseNumber: "" });

  useEffect(() => {
    if (!user) return;
    setDraft({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      licenseNumber: user.licenseNumber ?? "",
    });
  }, [user]);

  const save = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Not signed in");
      return authedFetch(`/api/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: draft.name,
          email: draft.email || null,
          phone: draft.phone,
          licenseNumber: draft.licenseNumber || null,
        }),
      });
    },
    onSuccess: async () => {
      await hydrate();
      void qc.invalidateQueries();
    },
  });

  if (!user) return <div>Loading…</div>;

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 720 }}>
      <h1
        style={{
          fontFamily: "Anton, Impact, system-ui, sans-serif",
          fontSize: 48,
          textTransform: "uppercase",
          margin: 0,
          color: colors.brand.trustWorth,
        }}
      >
        My profile
        <span style={{ color: colors.brand.trendyPink }}>.</span>
      </h1>

      <div
        style={{
          background: `linear-gradient(135deg, ${colors.brand.friendlyBlue}, ${colors.brand.trendyPink})`,
          color: "#fff",
          padding: 28,
          borderRadius: 20,
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            background: "rgba(255,255,255,0.2)",
            display: "grid",
            placeItems: "center",
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{user.name}</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>{user.email ?? user.phone}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {user.loyaltyTier} tier
            </span>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {user.loyaltyPoints} pts
            </span>
          </div>
        </div>
      </div>

      <ReferralCard />

      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 16,
          padding: 28,
          display: "grid",
          gap: 14,
        }}
      >
        <h3 style={{ margin: 0 }}>Account info</h3>
        <Field
          label="Name"
          value={draft.name}
          onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
        />
        <Field
          label="Email"
          value={draft.email}
          onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
        />
        <Field
          label="Phone"
          value={draft.phone}
          onChange={(v) => setDraft((d) => ({ ...d, phone: v }))}
        />
        <Field
          label="Driver's license #"
          value={draft.licenseNumber}
          onChange={(v) => setDraft((d) => ({ ...d, licenseNumber: v }))}
        />
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          style={{
            padding: 12,
            border: "none",
            borderRadius: 12,
            background: colors.brand.friendlyBlue,
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            opacity: save.isPending ? 0.6 : 1,
            marginTop: 8,
          }}
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
        {save.isSuccess && <div style={{ fontSize: 12, color: "#0A6B0A" }}>✓ Saved.</div>}
        {save.isError && (
          <div style={{ fontSize: 12, color: colors.brand.ultraRed }}>
            {(save.error as Error).message}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#4B4A6B",
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid #ECECF1",
          fontSize: 14,
          fontFamily: "inherit",
        }}
      />
    </label>
  );
}

function ReferralCard(): JSX.Element {
  const q = useQuery<{
    data: {
      code: string;
      usedCount: number;
      referrals: Array<{
        id: string;
        completedAt: string | null;
        referee: { id: string; name: string };
      }>;
    };
  }>({
    queryKey: ["referrals-me"],
    queryFn: () => authedFetch("/api/referrals/me"),
  });
  const data = q.data?.data;
  if (!data) return <div style={{ color: "#6B6A85", fontSize: 13 }}>Loading referrals…</div>;

  const completed = data.referrals.filter((r) => r.completedAt).length;
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${colors.brand.trendyPink} 0%, ${colors.brand.friendlyBlue} 100%)`,
        borderRadius: 16,
        padding: 24,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", opacity: 0.8 }}>
            YOUR REFERRAL CODE
          </div>
          <div
            style={{
              fontFamily: "Anton, Impact, sans-serif",
              fontSize: 36,
              letterSpacing: "0.04em",
              marginTop: 4,
            }}
          >
            {data.code}
          </div>
        </div>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(data.code);
            alert("Copied!");
          }}
          style={{
            padding: "10px 18px",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 10,
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Copy code
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, opacity: 0.92 }}>
        Share with friends. When they complete their first booking, you both earn 500 loyalty
        points.
      </p>
      <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
        <span>
          <strong>{data.usedCount}</strong> · joined
        </span>
        <span>
          <strong>{completed}</strong> · completed first ride
        </span>
        <span>
          <strong>{completed * 500}</strong> · pts earned
        </span>
      </div>
    </div>
  );
}
