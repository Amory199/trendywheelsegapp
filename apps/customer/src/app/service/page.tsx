"use client";

import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";

const PATHS = [
  {
    href: "/service/maintenance",
    label: "Maintenance",
    sub: "Battery, motor, electrical, cosmetic — we fix it.",
    image: "https://picsum.photos/seed/service-maintenance/1200/700",
  },
  {
    href: "/service/transport",
    label: "Transportation",
    sub: "Resort transfers, point A to B. Driver included.",
    image: "https://picsum.photos/seed/service-transport/1200/700",
  },
] as const;

export default function ServicePage(): JSX.Element {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "Anton, sans-serif",
            fontSize: "clamp(36px, 6vw, 56px)",
            margin: 0,
            letterSpacing: 0.4,
            lineHeight: 1,
          }}
        >
          Need something
          <br />
          <span style={{ color: colors.brand.trendyPink }}>looked after?</span>
        </h1>
      </div>
      <div
        style={{
          display: "grid",
          gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        {PATHS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="tw-press"
            style={{
              display: "block",
              position: "relative",
              borderRadius: 22,
              overflow: "hidden",
              minHeight: 280,
              textDecoration: "none",
              color: "#fff",
              backgroundImage: `url("${p.image}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(2,1,31,0.05) 0%, rgba(2,1,31,0.6) 65%, rgba(2,1,31,0.9) 100%)",
              }}
            />
            <div
              style={{
                position: "relative",
                padding: "28px 28px 30px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                minHeight: 280,
              }}
            >
              <div
                style={{
                  fontFamily: "Anton, sans-serif",
                  fontSize: 38,
                  letterSpacing: 0.3,
                  lineHeight: 1,
                }}
              >
                {p.label}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>{p.sub}</div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  color: colors.brand.ecoLimelight,
                }}
              >
                START →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
