"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { authedFetch } from "../../../lib/fetcher";

interface Vehicle {
  id: string;
  name: string;
  type: string;
  seating: number;
  fuelType: string;
  transmission: string;
  dailyRate: string | number;
  location: string;
  status: string;
  averageRating: string | number;
  features: string[];
  images?: Array<{ url: string }>;
}

export default function RentDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(tomorrow);

  const q = useQuery({
    queryKey: ["customer-vehicle", id],
    queryFn: () => authedFetch<{ data: Vehicle }>(`/api/vehicles/${id}`),
    enabled: Boolean(id),
  });

  const v = q.data?.data;

  const days = useMemo(() => {
    const d = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
    return Math.max(d, 1);
  }, [start, end]);

  const total = v ? Number(v.dailyRate) * days : 0;

  const bookMutation = useMutation({
    mutationFn: () =>
      authedFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: id,
          startDate: new Date(start).toISOString(),
          endDate: new Date(end).toISOString(),
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["customer-my-bookings"] });
      router.replace("/bookings?just_booked=1");
    },
  });

  if (q.isLoading) return <div style={{ color: "#6B6A85" }}>Loading…</div>;
  if (!v)
    return (
      <div>
        Vehicle not found.{" "}
        <Link href="/rent" style={{ color: colors.brand.friendlyBlue, fontWeight: 700 }}>
          ← back to fleet
        </Link>
      </div>
    );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 380px)", gap: 28 }}>
      <div>
        <div
          style={{
            background: "#fff",
            border: "1px solid #ECECF1",
            borderRadius: 16,
            overflow: "hidden",
            aspectRatio: "16/10",
          }}
        >
          {v.images?.[0]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.images[0].url} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#A0A0B0", fontSize: 60 }}>
              ⛳
            </div>
          )}
        </div>
        {v.images && v.images.length > 1 && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto" }}>
            {v.images.slice(1).map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={img.url}
                alt={`${v.name} photo ${i + 2}`}
                style={{
                  width: 96,
                  height: 64,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid #ECECF1",
                }}
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <h1
            style={{
              fontFamily: "Anton, Impact, system-ui, sans-serif",
              fontSize: 40,
              margin: 0,
              textTransform: "uppercase",
              color: colors.brand.trustWorth,
            }}
          >
            {v.name}
          </h1>
          <div style={{ display: "flex", gap: 12, color: "#6B6A85", fontSize: 14, marginTop: 8 }}>
            <span>📍 {v.location}</span>
            <span>👥 {v.seating} seats</span>
            <span style={{ textTransform: "capitalize" }}>⛽ {v.fuelType}</span>
            <span style={{ textTransform: "capitalize" }}>⚙️ {v.transmission}</span>
            <span>⭐ {Number(v.averageRating ?? 0).toFixed(1)}</span>
          </div>

          {Array.isArray(v.features) && v.features.length > 0 && (
            <>
              <h3 style={{ marginTop: 24, fontSize: 13, textTransform: "uppercase", color: "#6B6A85", letterSpacing: 0.6 }}>
                Features
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {v.features.map((f) => (
                  <span
                    key={f}
                    style={{
                      padding: "6px 12px",
                      background: "#F0F0F8",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      color: colors.brand.trustWorth,
                      textTransform: "capitalize",
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <aside
        style={{
          position: "sticky",
          top: 88,
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 20,
          padding: 24,
          height: "fit-content",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: colors.brand.trendyPink }}>
            EGP {Number(v.dailyRate).toLocaleString()}
          </span>
          <span style={{ color: "#6B6A85" }}>/ day</span>
        </div>

        <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
          <Field label="Pickup date" type="date" value={start} onChange={setStart} min={today} />
          <Field label="Return date" type="date" value={end} onChange={setEnd} min={start} />
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: "#F7F7FB",
            borderRadius: 12,
            display: "grid",
            gap: 6,
            fontSize: 14,
          }}
        >
          <Row label={`${days} day${days === 1 ? "" : "s"} × EGP ${Number(v.dailyRate).toLocaleString()}`}>
            <strong>EGP {total.toLocaleString()}</strong>
          </Row>
          <div style={{ height: 1, background: "#ECECF1", margin: "4px 0" }} />
          <Row label="Total">
            <strong style={{ color: colors.brand.trendyPink, fontSize: 18 }}>
              EGP {total.toLocaleString()}
            </strong>
          </Row>
        </div>

        {bookMutation.isError && (
          <div style={{ marginTop: 12, fontSize: 12, color: colors.brand.ultraRed }}>
            {(bookMutation.error as Error).message}
          </div>
        )}

        <button
          onClick={() => bookMutation.mutate()}
          disabled={bookMutation.isPending || !v.status || v.status !== "available"}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: 12,
            background: colors.brand.friendlyBlue,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            opacity: bookMutation.isPending ? 0.6 : 1,
          }}
        >
          {bookMutation.isPending ? "Booking…" : "Confirm booking →"}
        </button>
        <p style={{ marginTop: 10, fontSize: 11, color: "#6B6A85", textAlign: "center" }}>
          Cash on pickup. Free cancellation up to 24h before.
        </p>
      </aside>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  min,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
}): JSX.Element {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#4B4A6B", letterSpacing: 0.4, textTransform: "uppercase" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #ECECF1",
          fontSize: 14,
          fontFamily: "inherit",
        }}
      />
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#6B6A85" }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}
