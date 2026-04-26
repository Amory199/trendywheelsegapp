"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";

import { useAuth } from "../lib/auth-store";
import { authedFetch } from "../lib/fetcher";

interface VehicleRow {
  id: string;
  name: string;
  type: string;
  dailyRate: string | number;
  location: string;
  status: string;
  averageRating: string | number;
  images?: Array<{ url: string }>;
}

interface BookingRow {
  id: string;
  status: string;
  paymentStatus: string;
  startDate: string;
  endDate: string;
  totalCost: string | number;
  vehicle?: { id: string; name: string };
}

interface RepairRow {
  id: string;
  status: string;
  description: string;
  createdAt: string;
}

const QUICK_ACTIONS = [
  { href: "/sell/create", label: "Sell your car", icon: "🏷️", tone: "blue" },
  { href: "/repair", label: "Book a repair", icon: "🔧", tone: "pink" },
  { href: "/bookings", label: "My bookings", icon: "📅", tone: "pool" },
  { href: "/messages", label: "Support chat", icon: "💬", tone: "lime" },
] as const;

const TONE: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "rgba(43,15,248,0.10)", fg: colors.brand.friendlyBlue },
  pink: { bg: "rgba(255,0,101,0.12)", fg: colors.brand.trendyPink },
  pool: { bg: "rgba(0,199,234,0.14)", fg: "#006C80" },
  lime: { bg: "rgba(169,244,83,0.26)", fg: "#2D5B0B" },
};

export default function HomePage(): JSX.Element {
  const { user } = useAuth();

  const featuredQ = useQuery({
    queryKey: ["customer-featured"],
    queryFn: () => authedFetch<{ data: VehicleRow[] }>("/api/vehicles?available=true&limit=8"),
  });

  const myBookingsQ = useQuery({
    queryKey: ["customer-recent-bookings"],
    queryFn: () => authedFetch<{ data: BookingRow[] }>("/api/bookings?limit=3"),
  });

  const repairsQ = useQuery({
    queryKey: ["customer-recent-repairs"],
    queryFn: () => authedFetch<{ data: RepairRow[] }>("/api/repairs?limit=2"),
  });

  const featured = featuredQ.data?.data ?? [];
  const bookings = myBookingsQ.data?.data ?? [];
  const repairs = repairsQ.data?.data ?? [];

  const recent = [
    ...bookings.slice(0, 2).map((b) => ({
      id: `bk-${b.id}`,
      title: `Booking ${b.status} · ${b.vehicle?.name ?? "Vehicle"}`,
      sub: new Date(b.endDate).toLocaleDateString(),
      tone: b.status === "cancelled" ? "pink" : "lime",
    })),
    ...repairs.slice(0, 1).map((r) => ({
      id: `rp-${r.id}`,
      title: `Repair update · ${r.status.replace("-", " ")}`,
      sub: new Date(r.createdAt).toLocaleDateString(),
      tone: "pool",
    })),
  ];

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* ─── Hero card — gradient, radial pink, repeating diagonal stripes, Anton ── */}
      <section
        style={{
          borderRadius: 20,
          padding: "36px 36px 32px",
          position: "relative",
          overflow: "hidden",
          minHeight: 240,
          background: `linear-gradient(135deg, ${colors.brand.friendlyBlue} 0%, #0A0833 100%)`,
          color: "#fff",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(80% 80% at 100% 0%, rgba(255,0,101,0.45), transparent 55%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "repeating-linear-gradient(-18deg, transparent 0 24px, rgba(255,255,255,0.03) 24px 25px)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 2, maxWidth: 540 }}>
          <span
            style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: 999,
              background: colors.brand.trendyPink,
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Featured
          </span>
          <div
            style={{
              fontFamily: "Anton, Impact, system-ui, sans-serif",
              fontSize: "clamp(32px, 3.8vw, 48px)",
              lineHeight: 1.02,
              letterSpacing: "0.015em",
              textTransform: "uppercase",
              marginTop: 12,
            }}
          >
            Hi, {user?.name?.split(" ")[0] ?? "friend"}
            <br />
            <span style={{ color: colors.brand.trendyPink }}>rent your next ride.</span>
          </div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 10, maxWidth: 360, lineHeight: 1.55 }}>
            Over 1,200 vehicles ready across 14 cities.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <Link
              href="/rent"
              className="tw-press"
              style={{
                padding: "10px 18px",
                background: colors.brand.trendyPink,
                color: "#fff",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 13,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                letterSpacing: "0.02em",
              }}
            >
              Book a car →
            </Link>
            <Link
              href="/sell/create"
              className="tw-press"
              style={{
                padding: "10px 18px",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 13,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              List a car
            </Link>
          </div>
        </div>
        {/* faded car glyph at corner */}
        <div
          style={{
            position: "absolute",
            right: -20,
            bottom: -30,
            opacity: 0.15,
            fontSize: 220,
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          🚗
        </div>
      </section>

      {/* ─── Quick actions — responsive grid, auto-fit so it never overflows ─── */}
      <section>
        <h2 style={sectionH2}>Quick actions</h2>
        <div className="tw-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {QUICK_ACTIONS.map((q) => {
            const tone = TONE[q.tone];
            return (
              <Link
                key={q.href}
                href={q.href}
                className="tw-press"
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: 16,
                  border: "1px solid #ECECF1",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  textDecoration: "none",
                  color: colors.brand.trustWorth,
                  boxShadow: "0 1px 3px rgba(2,1,31,0.04)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: tone.bg,
                    color: tone.fg,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 20,
                  }}
                >
                  {q.icon}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{q.label}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Featured vehicles — horizontal scroll, 220px cards ───────── */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={sectionH2}>Featured vehicles</h2>
          <Link href="/rent" style={{ color: colors.brand.trendyPink, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            See all
          </Link>
        </div>
        {featuredQ.isLoading ? (
          <div className="tw-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="tw-skeleton" style={{ height: 240, borderRadius: 14 }} />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div style={{ color: "#6B6A85", fontSize: 14 }}>No vehicles available right now.</div>
        ) : (
          <div className="tw-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {featured.slice(0, 4).map((v) => (
              <VehicleMiniCard key={v.id} v={v} />
            ))}
          </div>
        )}
      </section>

      {/* ─── Recent activity — dot indicators with halo ─────────────── */}
      <section>
        <h2 style={sectionH2}>Recent activity</h2>
        {recent.length === 0 ? (
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
            No activity yet.{" "}
            <Link href="/rent" style={{ color: colors.brand.friendlyBlue, fontWeight: 700 }}>
              Browse the fleet →
            </Link>
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              border: "1px solid #ECECF1",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {recent.map((r, i) => {
              const dot = TONE[r.tone].fg;
              return (
                <div
                  key={r.id}
                  style={{
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    borderBottom: i < recent.length - 1 ? "1px solid #F0F0F8" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      background: dot,
                      boxShadow: `0 0 0 4px ${dot}22`,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: "#6B6A85", marginTop: 2 }}>{r.sub}</div>
                  </div>
                  <span style={{ color: "#A0A0B0", fontSize: 16 }}>›</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function VehicleMiniCard({ v }: { v: VehicleRow }): JSX.Element {
  const img = v.images?.[0]?.url;
  return (
    <Link
      href={`/rent/${v.id}`}
      className="tw-press"
      style={{
        background: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 4px 14px rgba(2,1,31,0.06)",
        textDecoration: "none",
        color: colors.brand.trustWorth,
        position: "relative",
      }}
    >
      <div style={{ height: 140, background: "#F0F0F8", position: "relative" }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#A0A0B0", fontSize: 40 }}>
            🚗
          </div>
        )}
        <span
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            padding: "3px 8px",
            borderRadius: 999,
            background: colors.brand.ecoLimelight,
            color: "#000",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Available
        </span>
        <button
          aria-label="Save"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 30,
            height: 30,
            borderRadius: 15,
            border: "none",
            background: "rgba(255,255,255,0.92)",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ♡
        </button>
      </div>
      <div style={{ padding: "10px 14px 14px" }}>
        <div style={{ fontSize: 9, color: "#6B6A85", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {v.type}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {v.name}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 13, color: colors.brand.trendyPink, fontWeight: 800 }}>
            EGP {Number(v.dailyRate).toLocaleString()}
            <span style={{ fontSize: 10, color: "#6B6A85", fontWeight: 500, marginLeft: 2 }}>/day</span>
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#F5B800" }}>
            ★ {Number(v.averageRating ?? 0).toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  );
}

const sectionH2: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 800,
  letterSpacing: "-0.01em",
  margin: "0 0 12px",
  color: colors.brand.trustWorth,
};
