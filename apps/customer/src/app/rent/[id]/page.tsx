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
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [loyaltyPts, setLoyaltyPts] = useState(0);

  const q = useQuery({
    queryKey: ["customer-vehicle", id],
    queryFn: () => authedFetch<{ data: Vehicle }>(`/api/vehicles/${id}`),
    enabled: Boolean(id),
  });

  const loyaltyQ = useQuery<{ data: { points: number; tier: string } }>({
    queryKey: ["customer-loyalty"],
    queryFn: () => authedFetch("/api/loyalty/me"),
  });

  const v = q.data?.data;

  const days = useMemo(() => {
    const d = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
    return Math.max(d, 1);
  }, [start, end]);

  const baseCost = v ? Number(v.dailyRate) * days : 0;
  const promoDiscount = appliedPromo?.discount ?? 0;
  const loyaltyDiscount = Math.min(loyaltyPts * 0.1, (baseCost - promoDiscount) * 0.5);
  const total = Math.max(0, baseCost - promoDiscount - loyaltyDiscount);

  const validatePromo = useMutation({
    mutationFn: (code: string) =>
      authedFetch<{ valid: boolean; reason?: string; code?: string; discount?: number }>(
        "/api/promo-codes/validate",
        {
          method: "POST",
          body: JSON.stringify({ code, totalAmount: baseCost }),
        },
      ),
    onSuccess: (r) => {
      if (r.valid && r.code && r.discount !== undefined)
        setAppliedPromo({ code: r.code, discount: r.discount });
      else alert(r.reason ?? "Invalid code");
    },
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      authedFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: id,
          startDate: new Date(start).toISOString(),
          endDate: new Date(end).toISOString(),
          promoCode: appliedPromo?.code,
          loyaltyPointsRedeemed: loyaltyPts >= 500 ? loyaltyPts : undefined,
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 380px)",
        gap: 28,
      }}
    >
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
            <img
              src={v.images[0].url}
              alt={v.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                display: "grid",
                placeItems: "center",
                height: "100%",
                color: "#A0A0B0",
                fontSize: 60,
              }}
            >
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
              <h3
                style={{
                  marginTop: 24,
                  fontSize: 13,
                  textTransform: "uppercase",
                  color: "#6B6A85",
                  letterSpacing: 0.6,
                }}
              >
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

        <div style={{ marginTop: 16, display: "flex", gap: 6 }}>
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Promo code"
            disabled={!!appliedPromo}
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1px solid #ECECF1",
              borderRadius: 8,
              fontSize: 13,
              background: appliedPromo ? `${colors.brand.ecoLimelight}22` : "#F7F7FB",
            }}
          />
          {appliedPromo ? (
            <button
              onClick={() => {
                setAppliedPromo(null);
                setPromoCode("");
              }}
              style={{
                padding: "0 14px",
                border: "1px solid #ECECF1",
                borderRadius: 8,
                background: "#fff",
                color: colors.brand.ultraRed,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          ) : (
            <button
              onClick={() => validatePromo.mutate(promoCode)}
              disabled={!promoCode || validatePromo.isPending}
              style={{
                padding: "0 16px",
                border: "none",
                borderRadius: 8,
                background: colors.brand.friendlyBlue,
                color: "#fff",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Apply
            </button>
          )}
        </div>

        {loyaltyQ.data?.data?.points && loyaltyQ.data.data.points >= 500 ? (
          <div style={{ marginTop: 12, padding: 12, background: "#F7F7FB", borderRadius: 10 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                fontWeight: 700,
                color: colors.brand.trustWorth,
              }}
            >
              <span>Redeem loyalty</span>
              <span style={{ color: colors.brand.trendyPink }}>
                {loyaltyPts} / {loyaltyQ.data.data.points} pts
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.min(loyaltyQ.data.data.points, Math.floor((baseCost - promoDiscount) * 5))}
              step={100}
              value={loyaltyPts}
              onChange={(e) => setLoyaltyPts(Number(e.target.value))}
              style={{ width: "100%", marginTop: 6 }}
            />
            <div style={{ fontSize: 10, color: "#6B6A85", marginTop: 4 }}>
              {loyaltyPts >= 500
                ? `−EGP ${(loyaltyPts * 0.1).toFixed(0)}`
                : "Min 500 pts to redeem"}
            </div>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "#F7F7FB",
            borderRadius: 12,
            display: "grid",
            gap: 6,
            fontSize: 14,
          }}
        >
          <Row
            label={`${days} day${days === 1 ? "" : "s"} × EGP ${Number(v.dailyRate).toLocaleString()}`}
          >
            <strong>EGP {baseCost.toLocaleString()}</strong>
          </Row>
          {promoDiscount > 0 ? (
            <Row label={`Promo ${appliedPromo?.code}`}>
              <strong
                style={{
                  color:
                    colors.brand.ecoLimelight === "#A9F453" ? "#3F7B0E" : colors.brand.ecoLimelight,
                }}
              >
                −EGP {promoDiscount.toLocaleString()}
              </strong>
            </Row>
          ) : null}
          {loyaltyDiscount > 0 ? (
            <Row label={`Loyalty (${loyaltyPts} pts)`}>
              <strong style={{ color: "#3F7B0E" }}>−EGP {loyaltyDiscount.toFixed(0)}</strong>
            </Row>
          ) : null}
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
