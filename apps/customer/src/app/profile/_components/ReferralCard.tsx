"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import type { JSX } from "react";

import { authedFetch } from "../../../lib/fetcher";

interface ReferralData {
  code: string;
  usedCount: number;
  referrals: Array<{
    id: string;
    completedAt: string | null;
    referee: { id: string; name: string };
  }>;
}

export function ReferralCard(): JSX.Element {
  const q = useQuery<{ data: ReferralData }>({
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
        padding: 22,
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
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", opacity: 0.85 }}>
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
