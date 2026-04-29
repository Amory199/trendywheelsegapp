"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useSearchParams } from "next/navigation";

import { authedFetch } from "../../lib/fetcher";

interface BookingRow {
  id: string;
  status: "confirmed" | "active" | "completed" | "cancelled";
  paymentStatus: string;
  startDate: string;
  endDate: string;
  totalCost: string | number;
  vehicle?: { id: string; name: string; type: string };
}

const STATUS_COLOR: Record<BookingRow["status"], { bg: string; fg: string }> = {
  confirmed: { bg: "#E6F0FF", fg: "#1338A8" },
  active: { bg: "#F0E5FF", fg: "#5300A8" },
  completed: { bg: "#E6F8E6", fg: "#0A6B0A" },
  cancelled: { bg: "#FFE6E6", fg: "#A00000" },
};

export default function BookingsPage(): JSX.Element {
  const qc = useQueryClient();
  const params = useSearchParams();
  const justBooked = params.get("just_booked") === "1";

  const q = useQuery({
    queryKey: ["customer-bookings"],
    queryFn: () => authedFetch<{ data: BookingRow[] }>("/api/bookings?limit=50"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => authedFetch(`/api/bookings/${id}/cancel`, { method: "POST" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["customer-bookings"] }),
  });

  const bookings = q.data?.data ?? [];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1
        style={{
          fontFamily: "Anton, Impact, system-ui, sans-serif",
          fontSize: 48,
          textTransform: "uppercase",
          margin: 0,
          color: colors.brand.trustWorth,
        }}
      >
        My bookings
        <span style={{ color: colors.brand.trendyPink }}>.</span>
      </h1>

      {justBooked && (
        <div
          style={{
            background: "#E6F8E6",
            color: "#0A6B0A",
            padding: 14,
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          ✓ Booking confirmed. Pay cash at pickup. We&apos;ll send a reminder 24h before.
        </div>
      )}

      {q.isLoading ? (
        <div style={{ color: "#6B6A85" }}>Loading…</div>
      ) : bookings.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: "#6B6A85" }}>
          No bookings yet.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {bookings.map((b) => {
            const tone = STATUS_COLOR[b.status] ?? STATUS_COLOR.confirmed;
            const canCancel = b.status === "confirmed" || b.status === "active";
            return (
              <div
                key={b.id}
                style={{
                  background: "#fff",
                  border: "1px solid #ECECF1",
                  borderRadius: 16,
                  padding: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: "#F0F0F8",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 26,
                  }}
                >
                  ⛳
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{b.vehicle?.name ?? "Vehicle"}</div>
                  <div style={{ fontSize: 12, color: "#6B6A85", marginTop: 2 }}>
                    {new Date(b.startDate).toLocaleDateString()} →{" "}
                    {new Date(b.endDate).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B6A85", marginTop: 2, textTransform: "capitalize" }}>
                    Payment: {b.paymentStatus}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>
                    EGP {Number(b.totalCost ?? 0).toLocaleString()}
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 6,
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "capitalize",
                      background: tone.bg,
                      color: tone.fg,
                    }}
                  >
                    {b.status}
                  </span>
                </div>
                {canCancel && (
                  <button
                    onClick={() => {
                      if (confirm("Cancel this booking?")) cancelMutation.mutate(b.id);
                    }}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: `1px solid ${colors.brand.ultraRed}`,
                      color: colors.brand.ultraRed,
                      background: "transparent",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
