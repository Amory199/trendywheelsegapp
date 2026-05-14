"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

type Category = "cart_new" | "cart_used" | "parts" | "accessory";

interface Product {
  id: string;
  category: Category;
  name: string;
  priceEgp: string | number;
  images: string[];
  inStock: boolean;
  brand?: string | null;
}

const TABS: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cart_new", label: "New carts" },
  { id: "cart_used", label: "Used carts" },
  { id: "parts", label: "Parts" },
  { id: "accessory", label: "Accessories" },
];

function fmtEgp(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  return `EGP ${n.toLocaleString()}`;
}

export default function BuyPage(): JSX.Element {
  const [tab, setTab] = useState<Category | "all">("all");
  const q = useQuery({
    queryKey: ["products", tab],
    queryFn: () => {
      const url =
        tab === "all" ? "/api/products?limit=60" : `/api/products?category=${tab}&limit=60`;
      return authedFetch<{ data: Product[] }>(url);
    },
  });
  const items = q.data?.data ?? [];

  return (
    <div>
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 22,
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "9px 16px",
                borderRadius: 999,
                border: active ? "none" : "1px solid rgba(2,1,31,0.12)",
                background: active ? colors.brand.trustWorth : "#fff",
                color: active ? "#fff" : colors.brand.trustWorth,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Empty / loading */}
      {q.isLoading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(2,1,31,0.5)" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(2,1,31,0.5)" }}>
          Nothing here yet.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, calc(50% - 6px)), 1fr))",
            gap: 14,
          }}
        >
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/buy/${p.id}`}
              className="tw-press"
              style={{
                textDecoration: "none",
                color: colors.brand.trustWorth,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "#EAEAF0",
                  position: "relative",
                  backgroundImage: p.images[0] ? `url("${p.images[0]}")` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!p.inStock ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(2,1,31,0.55)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: 2,
                    }}
                  >
                    OUT OF STOCK
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  fontFamily: "Anton, sans-serif",
                  fontSize: 22,
                  color: colors.brand.trendyPink,
                  letterSpacing: 0.3,
                }}
              >
                {fmtEgp(p.priceEgp)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
