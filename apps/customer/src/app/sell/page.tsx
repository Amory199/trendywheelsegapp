"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";

import { authedFetch } from "../../lib/fetcher";

interface ListingRow {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: string | number;
  status: string;
  images: string[];
  createdAt: string;
}

export default function SellPage(): JSX.Element {
  const q = useQuery({
    queryKey: ["customer-sell-list"],
    queryFn: () => authedFetch<{ data: ListingRow[] }>("/api/sales?status=active&limit=60"),
  });

  const listings = q.data?.data ?? [];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
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
            Cars for sale
            <span style={{ color: colors.brand.trendyPink }}>.</span>
          </h1>
          <p style={{ color: "#6B6A85", marginTop: 6 }}>
            {listings.length} listings from verified sellers.
          </p>
        </div>
        <Link
          href="/sell/create"
          style={{
            padding: "12px 22px",
            borderRadius: 12,
            background: colors.brand.trendyPink,
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          + List your car
        </Link>
      </div>

      {q.isLoading ? (
        <div style={{ color: "#6B6A85" }}>Loading…</div>
      ) : listings.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: "#6B6A85" }}>
          No listings right now.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {listings.map((l) => (
            <div
              key={l.id}
              style={{
                background: "#fff",
                border: "1px solid #ECECF1",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <div style={{ aspectRatio: "16/10", background: "#F0F0F8", position: "relative" }}>
                {l.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.images[0]} alt={l.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#A0A0B0", fontSize: 40 }}>
                    ⛳
                  </div>
                )}
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{l.title}</div>
                <div style={{ fontSize: 12, color: "#6B6A85", marginTop: 2 }}>
                  {l.make} {l.model} ({l.year})
                </div>
                <div style={{ fontWeight: 800, fontSize: 20, color: colors.brand.trendyPink, marginTop: 10 }}>
                  EGP {Number(l.price).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
