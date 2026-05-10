"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "../lib/auth-store";
import { authedFetch } from "../lib/fetcher";

interface ProductRow {
  id: string;
  name: string;
  category: string;
  priceEgp: string | number;
  images: string[];
}

const CHIPS = [
  { href: "/buy", label: "Buy", sub: "Carts · Parts · Accessories" },
  { href: "/rent", label: "Rent", sub: "By the day or weekend" },
  { href: "/sell", label: "Sell", sub: "Sell · List · Trade in" },
  { href: "/service", label: "Service", sub: "Repair · Transportation" },
] as const;

export default function HomePage(): JSX.Element {
  const { user } = useAuth();
  const [heroIdx, setHeroIdx] = useState(0);

  const heroQ = useQuery({
    queryKey: ["home-hero"],
    queryFn: () => authedFetch<{ data: ProductRow[] }>("/api/products?category=cart_new&limit=4"),
  });
  const heroes = heroQ.data?.data ?? [];

  // Cycle hero every 6s
  useEffect(() => {
    if (heroes.length < 2) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroes.length), 6000);
    return () => clearInterval(t);
  }, [heroes.length]);

  const heroImg =
    heroes[heroIdx]?.images?.[0] || "https://picsum.photos/seed/golf-cart-fallback/1600/900";

  return (
    <div style={{ marginTop: -28 }}>
      {/* HERO */}
      <section
        style={{
          position: "relative",
          height: "min(72vh, 640px)",
          minHeight: 480,
          marginLeft: -24,
          marginRight: -24,
          overflow: "hidden",
          borderRadius: 0,
        }}
      >
        {heroes.length === 0 ? null : null}
        {heroes.map((h, i) => (
          <div
            key={h.id}
            aria-hidden={i !== heroIdx}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url("${h.images?.[0]}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: i === heroIdx ? 1 : 0,
              transition: "opacity 800ms cubic-bezier(.2,.7,.3,1)",
            }}
          />
        ))}
        {heroes.length === 0 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url("${heroImg}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : null}

        {/* Gradient overlay for text legibility */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(2,1,31,0.15) 0%, rgba(2,1,31,0.55) 60%, rgba(2,1,31,0.85) 100%)",
          }}
        />

        {/* Hero copy */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "0 24px 36px",
            maxWidth: 1120,
            margin: "0 auto",
            color: "#fff",
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: 2.4,
              textTransform: "uppercase",
              opacity: 0.8,
              marginBottom: 10,
            }}
          >
            {user?.name ? `Hey, ${user.name.split(" ")[0]}` : "Cruise bold"}
          </div>
          <h1
            style={{
              fontFamily: "Anton, sans-serif",
              fontSize: "clamp(40px, 8vw, 96px)",
              lineHeight: 0.95,
              letterSpacing: 0.5,
              margin: 0,
              fontWeight: 400,
            }}
          >
            What do you
            <br />
            <span style={{ color: colors.brand.trendyPink }}>need today?</span>
          </h1>
        </div>
      </section>

      {/* CHIPS */}
      <section
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {CHIPS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="tw-press"
            style={{
              padding: "22px 24px",
              borderRadius: 18,
              background: "#fff",
              boxShadow: "0 6px 24px rgba(2,1,31,0.06)",
              textDecoration: "none",
              color: colors.brand.trustWorth,
              border: "1px solid rgba(2,1,31,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              transition: "transform 180ms ease, box-shadow 180ms ease",
            }}
          >
            <div
              style={{
                fontFamily: "Anton, sans-serif",
                fontSize: 32,
                lineHeight: 1,
                letterSpacing: 0.5,
              }}
            >
              {c.label}
            </div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{c.sub}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
