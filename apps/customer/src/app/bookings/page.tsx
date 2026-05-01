"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface BookingRow {
  id: string;
  status: "confirmed" | "active" | "completed" | "cancelled";
  paymentStatus: string;
  startDate: string;
  endDate: string;
  totalCost: string | number;
  review?: { id: string; rating: number } | null;
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

  const [reviewing, setReviewing] = useState<BookingRow | null>(null);

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
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 40,
            textAlign: "center",
            color: "#6B6A85",
          }}
        >
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
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6B6A85",
                      marginTop: 2,
                      textTransform: "capitalize",
                    }}
                  >
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
                {b.status === "completed" && !b.review ? (
                  <button
                    onClick={() => setReviewing(b)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "none",
                      color: "#fff",
                      background: colors.brand.trendyPink,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    ★ Rate trip
                  </button>
                ) : null}
                {b.review ? (
                  <span style={{ fontSize: 12, color: "#6B6A85" }}>★ {b.review.rating}/5</span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {reviewing ? (
        <ReviewModal
          booking={reviewing}
          onClose={() => setReviewing(null)}
          onSaved={() => {
            setReviewing(null);
            void qc.invalidateQueries({ queryKey: ["customer-bookings"] });
          }}
        />
      ) : null}
    </div>
  );
}

function ReviewModal({
  booking,
  onClose,
  onSaved,
}: {
  booking: BookingRow;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const submit = useMutation({
    mutationFn: () =>
      authedFetch(`/api/bookings/${booking.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          title: title || undefined,
          body: body || undefined,
          photos: [],
        }),
      }),
    onSuccess: () => onSaved(),
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,1,31,0.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          maxWidth: 440,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.brand.trendyPink,
              letterSpacing: "0.12em",
            }}
          >
            RATE YOUR TRIP
          </span>
          <h2
            style={{
              fontFamily: "Anton, Impact, sans-serif",
              fontSize: 28,
              margin: "4px 0 0",
              textTransform: "uppercase",
            }}
          >
            {booking.vehicle?.name}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: "12px 0" }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setRating(s)}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 36,
                cursor: "pointer",
                color: s <= rating ? colors.brand.trendyPink : "#ECECF1",
              }}
            >
              ★
            </button>
          ))}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Headline (optional)"
          style={{
            padding: "10px 12px",
            border: "1px solid #ECECF1",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell us about it (optional)"
          rows={4}
          style={{
            padding: "10px 12px",
            border: "1px solid #ECECF1",
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 12,
              border: "1px solid #ECECF1",
              borderRadius: 10,
              background: "#fff",
              color: "#6B6A85",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            style={{
              flex: 2,
              padding: 12,
              border: "none",
              borderRadius: 10,
              background: colors.brand.friendlyBlue,
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {submit.isPending ? "Posting…" : "Post review"}
          </button>
        </div>
      </div>
    </div>
  );
}
