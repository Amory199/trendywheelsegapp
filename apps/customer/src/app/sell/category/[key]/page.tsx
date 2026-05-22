"use client";

import { useQuery } from "@tanstack/react-query";
import { VEHICLE_CATEGORIES } from "@trendywheels/types";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { authedFetch } from "../../../../lib/fetcher";

const VIDEO_KEYS = new Set([
  "golf-cart",
  "scooter",
  "scooter-sidecar",
  "buggy",
  "utv",
  "jet-ski",
  "hover-board",
]);

interface ListingRow {
  id: string;
  title: string;
  askPrice?: number;
  city?: string;
  images?: Array<{ url: string }>;
}

export default function SellCategoryPage(): JSX.Element {
  const router = useRouter();
  const params = useParams<{ key: string }>();
  const key = params?.key ?? "";
  const meta = VEHICLE_CATEGORIES.find((c) => c.key === key);
  const isAll = key === "all";
  const label = isAll ? "All listings" : (meta?.label ?? "Listings");
  // Server stores category with underscores (golf_cart, jet_ski). Mirror the
  // mobile map (apps/mobile/app/sell/category/[key].tsx).
  const serverKey = key.replace(/-/g, "_");

  const q = useQuery<{ data: ListingRow[] }>({
    queryKey: ["sell-category", key],
    queryFn: () =>
      authedFetch(
        `/api/sales?status=active&limit=60${isAll || !meta ? "" : `&category=${serverKey}`}`,
      ),
  });

  const listings = q.data?.data ?? [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 280,
          overflow: "hidden",
          borderRadius: 16,
          background: "#000",
        }}
      >
        {VIDEO_KEYS.has(key) ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          >
            <source src={`/category/${key}.mp4`} type="video/mp4" />
          </video>
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `linear-gradient(135deg, ${colors.brand.trendyPink}, ${colors.brand.friendlyBlue})`,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        <button
          onClick={() => router.back()}
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            width: 36,
            height: 36,
            borderRadius: 18,
            border: "none",
            background: "rgba(0,0,0,0.45)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 18,
          }}
        >
          ‹
        </button>
        <div
          style={{
            position: "absolute",
            left: 24,
            bottom: 18,
            color: "#fff",
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
            letterSpacing: 0.6,
          }}
        >
          {label}
        </div>
      </div>

      <p style={{ color: "#6B6A85", margin: 0 }}>
        {q.isLoading
          ? "Loading…"
          : listings.length === 0
            ? "No listings in this category yet."
            : `${listings.length} listings`}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {listings.map((l) => (
          <Link
            key={l.id}
            href={`/buy/${l.id}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              background: "#fff",
              border: "1px solid #ECECF1",
              borderRadius: 14,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                height: 160,
                background: "#F4F4F8",
                backgroundImage: l.images?.[0]?.url ? `url(${l.images[0].url})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1A1933" }}>{l.title}</div>
              {l.city ? (
                <div style={{ fontSize: 13, color: "#6B6A85", marginTop: 2 }}>{l.city}</div>
              ) : null}
              {l.askPrice ? (
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: "Anton, Impact, sans-serif",
                    color: colors.brand.trendyPink,
                    fontSize: 22,
                  }}
                >
                  {l.askPrice.toLocaleString()} EGP
                </div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
