"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { JSX } from "react";

import { baseUrl } from "../../../lib/api";
import { OpenInAppBanner } from "../../../lib/open-in-app-banner";

interface Vehicle {
  id: string;
  name: string;
  location: string;
  status: string;
  listingType: string;
  saleDescription?: string | null;
  features?: string[];
  images?: Array<{ url: string } | string>;
}

function imageUrls(v: Vehicle | undefined): string[] {
  return (v?.images ?? [])
    .map((i) => (typeof i === "string" ? i : i?.url))
    .filter((u): u is string => Boolean(u));
}

// Public, guest-facing landing page for a shared FOR-SALE listing. Recipients on
// a phone with the app installed are deep-linked straight into the app; everyone
// else lands here. Images are shown in full; price and reserve are gated behind
// the app / sign-in (mirrors the mobile guest treatment).
export default function SaleListingPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [idx, setIdx] = useState(0);

  const q = useQuery({
    queryKey: ["public-sale-vehicle", id],
    queryFn: async (): Promise<{ data: Vehicle }> => {
      const res = await fetch(`${baseUrl}/api/vehicles/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json() as Promise<{ data: Vehicle }>;
    },
    enabled: Boolean(id),
  });

  const v = q.data?.data;
  const imgs = imageUrls(v);

  return (
    <div style={styles.page}>
      <OpenInAppBanner />
      <div style={styles.container}>
        {q.isLoading ? (
          <div style={styles.muted}>Loading…</div>
        ) : !v ? (
          <div style={styles.muted}>This listing is no longer available.</div>
        ) : (
          <>
            <div style={styles.hero}>
              {imgs.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgs[idx]} alt={v.name} style={styles.heroImg} />
              ) : (
                <div style={{ ...styles.heroImg, ...styles.heroPlaceholder }}>🛻</div>
              )}
              {imgs.length > 1 ? (
                <div style={styles.thumbs}>
                  {imgs.map((u, i) => (
                    <button
                      key={u}
                      onClick={() => setIdx(i)}
                      style={{
                        ...styles.thumb,
                        borderColor: i === idx ? colors.brand.trendyPink : "transparent",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" style={styles.thumbImg} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={styles.body}>
              <span style={styles.badge}>For sale</span>
              <h1 style={styles.title}>{v.name}</h1>
              <div style={styles.location}>📍 {v.location}</div>

              {/* Price gate — guests see the app prompt, not the number. */}
              <div style={styles.gate}>
                <div style={styles.lock}>🔒</div>
                <div>
                  <div style={styles.gateTitle}>Sign in on the app to see the price</div>
                  <div style={styles.gateSub}>
                    Browse freely — pricing and reserving open once you&apos;re in the app.
                  </div>
                </div>
              </div>

              {v.saleDescription ? <p style={styles.desc}>{v.saleDescription}</p> : null}

              {v.features && v.features.length > 0 ? (
                <div style={styles.chips}>
                  {v.features.map((f) => (
                    <span key={f} style={styles.chip}>
                      {f}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0b0a1f", color: "#fff" },
  container: { maxWidth: 720, margin: "0 auto", padding: 16 },
  muted: { color: "rgba(255,255,255,0.6)", padding: 40, textAlign: "center" },
  hero: { borderRadius: 18, overflow: "hidden", background: "#15132f" },
  heroImg: { width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" },
  heroPlaceholder: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 64,
  },
  thumbs: { display: "flex", gap: 8, padding: 10, overflowX: "auto" },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    border: "2px solid transparent",
    padding: 0,
    background: "none",
    cursor: "pointer",
    flex: "0 0 auto",
  },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  body: { padding: "18px 4px", display: "flex", flexDirection: "column", gap: 12 },
  badge: {
    alignSelf: "flex-start",
    background: colors.brand.trendyPink,
    color: "#fff",
    fontSize: 12,
    fontWeight: 800,
    padding: "4px 10px",
    borderRadius: 999,
  },
  title: { fontSize: 26, fontWeight: 800, margin: 0 },
  location: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  gate: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    background: "rgba(255,0,101,0.10)",
    border: "1px solid rgba(255,0,101,0.35)",
    borderRadius: 14,
    padding: 16,
  },
  lock: { fontSize: 26 },
  gateTitle: { fontWeight: 800, fontSize: 15 },
  gateSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  desc: { color: "rgba(255,255,255,0.85)", lineHeight: 1.6, fontSize: 15 },
  chips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: {
    background: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 13,
  },
};
