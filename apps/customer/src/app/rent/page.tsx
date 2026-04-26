"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface VehicleRow {
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
  images?: Array<{ url: string }>;
}

const TYPES = ["all", "sedan", "suv", "hatchback", "luxury", "van"];

export default function RentPage(): JSX.Element {
  const [type, setType] = useState("all");

  const q = useQuery({
    queryKey: ["customer-rent-list", type],
    queryFn: () => {
      const params = new URLSearchParams({ available: "true", limit: "60" });
      if (type !== "all") params.set("type", type);
      return authedFetch<{ data: VehicleRow[] }>(`/api/vehicles?${params}`);
    },
  });

  const vehicles = q.data?.data ?? [];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <h1
          style={{
            fontFamily: "Anton, Impact, system-ui, sans-serif",
            fontSize: 48,
            textTransform: "uppercase",
            margin: 0,
            color: colors.brand.trustWorth,
          }}
        >
          Find your ride
          <span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
        <p style={{ color: "#6B6A85", marginTop: 6 }}>{vehicles.length} cars available right now.</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              background: type === t ? colors.brand.friendlyBlue : "#fff",
              color: type === t ? "#fff" : colors.brand.trustWorth,
              fontWeight: 700,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              boxShadow: type === t ? `0 4px 12px ${colors.brand.friendlyBlue}33` : "none",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div style={{ color: "#6B6A85" }}>Loading…</div>
      ) : vehicles.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: "#6B6A85" }}>
          No vehicles match this filter.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {vehicles.map((v) => (
            <Link
              key={v.id}
              href={`/rent/${v.id}`}
              style={{
                display: "block",
                background: "#fff",
                border: "1px solid #ECECF1",
                borderRadius: 16,
                overflow: "hidden",
                textDecoration: "none",
                color: colors.brand.trustWorth,
              }}
            >
              <div style={{ aspectRatio: "16/10", background: "#F0F0F8", position: "relative" }}>
                {v.images?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.images[0].url} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#A0A0B0", fontSize: 36 }}>
                    🚗
                  </div>
                )}
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#F0F0F8", color: "#6B6A85", fontWeight: 700, textTransform: "uppercase" }}>
                    {v.type}
                  </span>
                  <span style={{ fontSize: 11, color: "#6B6A85" }}>👥 {v.seating}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{v.name}</div>
                <div style={{ fontSize: 12, color: "#6B6A85", marginTop: 4 }}>📍 {v.location}</div>
                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 18, color: colors.brand.trendyPink }}>
                      EGP {Number(v.dailyRate).toLocaleString()}
                    </span>
                    <span style={{ fontSize: 12, color: "#6B6A85", marginLeft: 4 }}>/ day</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#6B6A85" }}>⭐ {Number(v.averageRating ?? 0).toFixed(1)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
