"use client";

import { useQuery } from "@tanstack/react-query";
import { colors, LISTING_STATUS_TONE, type SalesListingStatus } from "@trendywheels/ui-tokens";
import Link from "next/link";

import { useAuth } from "../../../lib/auth-store";
import { authedFetch } from "../../../lib/fetcher";

interface Listing {
  id: string;
  title: string;
  category: string;
  askPrice?: number;
  status: SalesListingStatus;
  createdAt: string;
}

export default function MyListingsPage(): JSX.Element {
  const { user } = useAuth();
  const q = useQuery<{ data: Listing[] }>({
    queryKey: ["my-listings", user?.id],
    queryFn: () => authedFetch(`/api/sales?userId=${user?.id}&status=`),
    enabled: !!user,
  });
  if (!user) return <div style={{ padding: 24 }}>Sign in to manage your listings.</div>;
  if (q.isLoading) return <div style={{ padding: 24 }}>Loading…</div>;

  const rows = q.data?.data ?? [];

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 720, margin: "0 auto", padding: "8px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: "clamp(2rem, 7vw, 3rem)",
            textTransform: "uppercase",
            margin: 0,
            color: colors.brand.trustWorth,
          }}
        >
          My listings<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
        <Link
          href="/sell/create"
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: colors.brand.trendyPink,
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          + New listing
        </Link>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #ECECF1",
            borderRadius: 16,
            padding: 32,
            textAlign: "center",
            color: "#6B6A85",
          }}
        >
          No listings yet. Tap “+ New listing” to post your first one.
        </div>
      ) : (
        rows.map((l) => {
          const s = LISTING_STATUS_TONE[l.status] ?? LISTING_STATUS_TONE.paused;
          return (
            <Link
              key={l.id}
              href={`/sell/${l.id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                background: "#fff",
                border: "1px solid #ECECF1",
                borderRadius: 14,
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#1A1933" }}>{l.title}</div>
                <div style={{ fontSize: 13, color: "#6B6A85", marginTop: 2 }}>
                  {l.category.replace(/_/g, " ")} · listed{" "}
                  {new Date(l.createdAt).toLocaleDateString()}
                </div>
                {l.askPrice ? (
                  <div style={{ fontSize: 13, color: "#1A1933", marginTop: 4 }}>
                    <strong>{l.askPrice.toLocaleString()} EGP</strong>
                  </div>
                ) : null}
              </div>
              <span
                style={{
                  background: s.bg,
                  color: s.fg,
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {l.status}
              </span>
            </Link>
          );
        })
      )}
    </div>
  );
}
