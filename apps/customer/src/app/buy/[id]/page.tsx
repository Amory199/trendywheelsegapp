"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { authedFetch } from "../../../lib/fetcher";

interface Product {
  id: string;
  category: string;
  name: string;
  description?: string | null;
  priceEgp: string | number;
  images: string[];
  inStock: boolean;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  attributes?: Record<string, unknown>;
}

function fmtEgp(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  return `EGP ${n.toLocaleString()}`;
}

export default function ProductDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [imgIdx, setImgIdx] = useState(0);
  const [showSpecs, setShowSpecs] = useState(false);

  const q = useQuery({
    queryKey: ["product", params.id],
    queryFn: () => authedFetch<{ data: Product }>(`/api/products/${params.id}`),
  });
  const p = q.data?.data;

  const buyMut = useMutation({
    mutationFn: () =>
      authedFetch<{ data: { id: string } }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ items: [{ productId: params.id, quantity: 1 }] }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-orders"] });
      router.push("/profile?tab=orders");
    },
  });

  if (q.isLoading) return <div style={{ padding: 60, textAlign: "center" }}>Loading…</div>;
  if (!p) return <div style={{ padding: 60, textAlign: "center" }}>Not found.</div>;

  const isCart = p.category === "cart_new" || p.category === "cart_used";

  return (
    <div style={{ marginTop: -28 }}>
      {/* Hero carousel */}
      <section
        style={{
          marginLeft: -24,
          marginRight: -24,
          height: "min(60vh, 540px)",
          minHeight: 360,
          position: "relative",
          background: "#EAEAF0",
          overflow: "hidden",
        }}
      >
        {p.images.map((src, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url("${src}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: i === imgIdx ? 1 : 0,
              transition: "opacity 600ms cubic-bezier(.2,.7,.3,1)",
            }}
          />
        ))}
        {p.images.length > 1 ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 18,
              display: "flex",
              gap: 6,
              justifyContent: "center",
            }}
          >
            {p.images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                aria-label={`Image ${i + 1}`}
                style={{
                  width: i === imgIdx ? 26 : 8,
                  height: 8,
                  borderRadius: 4,
                  border: "none",
                  background: i === imgIdx ? "#fff" : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  transition: "width 200ms ease",
                }}
              />
            ))}
          </div>
        ) : null}
      </section>

      {/* Content */}
      <section style={{ marginTop: 28, paddingBottom: 100 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "rgba(2,1,31,0.5)",
            marginBottom: 8,
          }}
        >
          {p.category.replace("_", " ")}
          {p.brand ? ` · ${p.brand}` : ""}
        </div>
        <h1
          style={{
            fontFamily: "Anton, sans-serif",
            fontSize: "clamp(28px, 5vw, 44px)",
            margin: 0,
            lineHeight: 1.05,
            letterSpacing: 0.3,
          }}
        >
          {p.name}
        </h1>
        <div
          style={{
            fontFamily: "Anton, sans-serif",
            fontSize: 38,
            color: colors.brand.trendyPink,
            marginTop: 14,
            letterSpacing: 0.3,
          }}
        >
          {fmtEgp(p.priceEgp)}
        </div>

        {p.description ? (
          <p style={{ fontSize: 15, marginTop: 18, opacity: 0.8, maxWidth: 720 }}>
            {p.description}
          </p>
        ) : null}

        {/* Specs accordion */}
        {(p.brand || p.model || p.year || Object.keys(p.attributes ?? {}).length > 0) && (
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setShowSpecs((s) => !s)}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                fontSize: 13,
                fontWeight: 600,
                color: colors.brand.friendlyBlue,
                cursor: "pointer",
              }}
            >
              {showSpecs ? "Hide details ▴" : "Show details ▾"}
            </button>
            {showSpecs ? (
              <div
                style={{
                  marginTop: 12,
                  background: "#fff",
                  borderRadius: 14,
                  padding: 18,
                  border: "1px solid rgba(2,1,31,0.06)",
                  fontSize: 14,
                  display: "grid",
                  gridTemplateColumns: "max-content 1fr",
                  gap: "8px 18px",
                }}
              >
                {p.brand ? (
                  <>
                    <div style={{ opacity: 0.55 }}>Brand</div>
                    <div>{p.brand}</div>
                  </>
                ) : null}
                {p.model ? (
                  <>
                    <div style={{ opacity: 0.55 }}>Model</div>
                    <div>{p.model}</div>
                  </>
                ) : null}
                {p.year ? (
                  <>
                    <div style={{ opacity: 0.55 }}>Year</div>
                    <div>{p.year}</div>
                  </>
                ) : null}
                {Object.entries(p.attributes ?? {}).map(([k, v]) => (
                  <span key={k} style={{ display: "contents" }}>
                    <div style={{ opacity: 0.55 }}>{k}</div>
                    <div>{String(v)}</div>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Trade-in CTA for used carts */}
        {p.category === "cart_used" ? (
          <Link
            href={`/sell/trade-in?replacement=${p.id}`}
            style={{
              display: "inline-block",
              marginTop: 22,
              fontSize: 13,
              color: colors.brand.friendlyBlue,
              fontWeight: 600,
            }}
          >
            Trading yours in? →
          </Link>
        ) : null}
      </section>

      {/* Sticky CTA */}
      <div
        className="tw-safe-bottom"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#fff",
          borderTop: "1px solid rgba(2,1,31,0.06)",
          padding: "14px clamp(14px, 4vw, 24px)",
          zIndex: 10,
          boxShadow: "0 -8px 30px rgba(2,1,31,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Total</div>
            <div
              style={{
                fontFamily: "Anton, sans-serif",
                fontSize: 24,
                color: colors.brand.trendyPink,
              }}
            >
              {fmtEgp(p.priceEgp)}
            </div>
          </div>
          <button
            disabled={!p.inStock || buyMut.isPending}
            onClick={() => buyMut.mutate()}
            className="tw-press"
            style={{
              padding: "14px 26px",
              borderRadius: 12,
              border: "none",
              background: p.inStock ? colors.brand.friendlyBlue : "rgba(2,1,31,0.2)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: p.inStock ? "pointer" : "not-allowed",
              minWidth: isCart ? 200 : 160,
            }}
          >
            {buyMut.isPending
              ? "Placing order…"
              : !p.inStock
                ? "Unavailable"
                : isCart
                  ? "Reserve now"
                  : "Buy now"}
          </button>
        </div>
      </div>
    </div>
  );
}
