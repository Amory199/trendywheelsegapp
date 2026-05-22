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

interface VehicleRow {
  id: string;
  name: string;
  type: string;
  seating: number;
  dailyRate: string | number;
  location: string;
  images?: Array<{ url: string }>;
}

export default function RentCategoryPage(): JSX.Element {
  const router = useRouter();
  const params = useParams<{ key: string }>();
  const key = params?.key ?? "";
  const meta = VEHICLE_CATEGORIES.find((c) => c.key === key);
  const isAll = key === "all";
  const label = isAll ? "All categories" : (meta?.label ?? "Vehicles");

  const q = useQuery<{ data: VehicleRow[] }>({
    queryKey: ["rent-category", key],
    queryFn: () =>
      authedFetch(
        `/api/vehicles?listingType=rent&available=true&limit=60${isAll || !meta ? "" : `&category=${key}`}`,
      ),
  });

  const vehicles = q.data?.data ?? [];

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
          : vehicles.length === 0
            ? "Nothing available in this category right now."
            : `${vehicles.length} available`}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {vehicles.map((v) => (
          <Link
            key={v.id}
            href={`/rent/${v.id}`}
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
                backgroundImage: v.images?.[0]?.url ? `url(${v.images[0].url})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1A1933" }}>{v.name}</div>
              <div style={{ fontSize: 13, color: "#6B6A85", marginTop: 2 }}>
                {v.location} · {v.seating} seats
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "Anton, Impact, sans-serif",
                  color: colors.brand.friendlyBlue,
                  fontSize: 22,
                }}
              >
                {Number(v.dailyRate).toLocaleString()} EGP
                <span style={{ fontSize: 12, color: "#6B6A85", marginLeft: 4 }}>/ day</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
