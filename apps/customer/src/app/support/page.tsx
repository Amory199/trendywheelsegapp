"use client";

import { TWLogoLockup } from "@trendywheels/ui-brand/web";
import { useState } from "react";
import type { JSX } from "react";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I pick up my golf cart?",
    a: "Once your booking is confirmed we'll text you the pickup address on the morning of your rental. Show your driver's license at pickup and you're set.",
  },
  {
    q: "What's the minimum rental length?",
    a: "One day. Half-day rentals are available in Marassi and El Gouna only; ask in-app.",
  },
  {
    q: "What if the cart breaks down?",
    a: "Use the in-app Service → Maintenance flow or call our hotline below. We'll dispatch a replacement within the hour for Marassi, El Gouna, and Sahel.",
  },
  {
    q: "Can I extend my rental mid-trip?",
    a: "Yes — open the booking in the app and tap Extend. Subject to availability and same daily rate.",
  },
  {
    q: "How does the trade-in work?",
    a: "Submit photos + specs of your current cart through Sell → Trade in. We send a quote within 24 hours; if you accept, the credit applies to any new-cart purchase.",
  },
  {
    q: "What forms of payment do you accept?",
    a: "Cash on pickup is supported everywhere. Card / Instapay is available for online checkout (in-app).",
  },
];

export default function SupportPage(): JSX.Element {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#02011F",
        color: "#fff",
        padding: "clamp(24px, 6vw, 48px) clamp(16px, 4vw, 24px) clamp(48px, 10vw, 96px)",
        fontFamily: "Source Sans 3, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "min(720px, 100%)", margin: "0 auto" }}>
        <a
          href="/"
          style={{
            display: "inline-block",
            marginBottom: "clamp(20px, 5vw, 32px)",
            textDecoration: "none",
          }}
        >
          <TWLogoLockup size={36} color="#fff" />
        </a>
        <h1
          style={{
            fontFamily: "Anton, sans-serif",
            fontSize: "clamp(2rem, 8vw, 3rem)",
            lineHeight: 1.05,
            marginBottom: 16,
            letterSpacing: ".01em",
          }}
        >
          Help & Support
        </h1>
        <p
          style={{
            fontSize: "clamp(15px, 1.2vw, 16px)",
            opacity: 0.8,
            lineHeight: 1.7,
            marginBottom: "clamp(28px, 6vw, 40px)",
          }}
        >
          We're a small Egyptian team. Reach us any of these ways and we'll come back to you the
          same day.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(220px, 100%), 1fr))",
            gap: "clamp(10px, 2.5vw, 14px)",
            marginBottom: "clamp(40px, 9vw, 56px)",
          }}
        >
          <Channel
            icon="✉️"
            label="Email"
            value="support@trendywheelseg.com"
            href="mailto:support@trendywheelseg.com"
          />
          <Channel
            icon="💬"
            label="WhatsApp"
            value="+20 100 500 8410"
            href="https://wa.me/201005008410"
          />
          <Channel icon="📞" label="Phone" value="+20 100 500 8410" href="tel:+201005008410" />
        </div>

        <h2
          style={{
            fontFamily: "Anton, sans-serif",
            fontSize: "clamp(1.375rem, 5vw, 1.75rem)",
            marginBottom: 20,
            letterSpacing: ".02em",
          }}
        >
          Frequently asked
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQS.map((f, i) => (
            <details
              key={i}
              open={open === i}
              onClick={(e) => {
                e.preventDefault();
                setOpen(open === i ? null : i);
              }}
              style={{
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 12,
                padding: "16px 20px",
                cursor: "pointer",
              }}
            >
              <summary
                style={{
                  listStyle: "none",
                  fontSize: 16,
                  fontWeight: 600,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{f.q}</span>
                <span style={{ color: "#FF0065", fontSize: 20 }}>{open === i ? "−" : "+"}</span>
              </summary>
              <p style={{ marginTop: 12, opacity: 0.75, lineHeight: 1.7, fontSize: 15 }}>{f.a}</p>
            </details>
          ))}
        </div>

        <div
          style={{
            marginTop: 48,
            padding: 20,
            background: "rgba(43, 15, 248, .08)",
            border: "1px solid rgba(43, 15, 248, .25)",
            borderRadius: 14,
            fontSize: 14,
            opacity: 0.8,
            lineHeight: 1.7,
          }}
        >
          For privacy or account-deletion requests, please use{" "}
          <a href="/account/delete" style={{ color: "#A9F453" }}>
            /account/delete
          </a>{" "}
          or email{" "}
          <a href="mailto:privacy@trendywheelseg.com" style={{ color: "#A9F453" }}>
            privacy@trendywheelseg.com
          </a>
          .
        </div>
      </div>
    </main>
  );
}

function Channel({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        padding: 20,
        background: "rgba(255,255,255,.05)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 14,
        textDecoration: "none",
        color: "#fff",
        transition: "all .2s",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: ".14em",
          opacity: 0.5,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
    </a>
  );
}
