"use client";

import { useQuery } from "@tanstack/react-query";
import type { BookingStatus } from "@trendywheels/types";
import { BOOKING_STATUS_TONE, colors } from "@trendywheels/ui-tokens";
import Link from "next/link";

import { useAuth } from "../../../lib/auth-store";
import { authedFetch } from "../../../lib/fetcher";

interface Booking {
  id: string;
  vehicleId: string | null;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  totalAmount?: number;
  createdAt: string;
}

export default function MyBookingsPage(): JSX.Element {
  const { user } = useAuth();
  const q = useQuery<{ data: Booking[] }>({
    queryKey: ["my-bookings"],
    queryFn: () => authedFetch("/api/bookings?limit=50"),
    enabled: !!user,
  });

  if (!user) return <div style={{ padding: 24 }}>Sign in to see your bookings.</div>;
  if (q.isLoading) return <div style={{ padding: 24 }}>Loading…</div>;

  const rows = q.data?.data ?? [];

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
        My bookings<span style={{ color: colors.brand.trendyPink }}>.</span>
      </h1>

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
          <p>No bookings yet.</p>
          <Link
            href="/rent"
            style={{
              display: "inline-block",
              marginTop: 12,
              padding: "10px 18px",
              borderRadius: 10,
              background: colors.brand.friendlyBlue,
              color: "#fff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Browse vehicles
          </Link>
        </div>
      ) : (
        rows.map((b) => {
          const s = BOOKING_STATUS_TONE[b.status];
          return (
            <div
              key={b.id}
              style={{
                background: "#fff",
                border: "1px solid #ECECF1",
                borderRadius: 14,
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#1A1933" }}>
                  Booking #{b.id.slice(0, 8)}
                </div>
                <div style={{ fontSize: 13, color: "#6B6A85", marginTop: 2 }}>
                  {new Date(b.startDate).toLocaleDateString()} →{" "}
                  {new Date(b.endDate).toLocaleDateString()}
                </div>
                {b.totalAmount ? (
                  <div style={{ fontSize: 13, color: "#1A1933", marginTop: 4 }}>
                    Total: <strong>{b.totalAmount.toLocaleString()} EGP</strong>
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
                {b.status}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
