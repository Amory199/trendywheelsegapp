"use client";

import { TWLogoLockup } from "@trendywheels/ui-brand/web";
import { useState } from "react";

import { baseUrl } from "../../../lib/api";

export default function DeleteAccountPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch(`${baseUrl}/api/users/request-deletion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, reason: reason || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? `HTTP ${res.status}`);
      }
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#02011F",
        color: "#fff",
        padding: "48px 24px 96px",
        fontFamily: "Source Sans 3, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <a href="/" style={{ display: "inline-block", textDecoration: "none", marginBottom: 32 }}>
          <TWLogoLockup size={36} color="#fff" />
        </a>

        <h1
          style={{
            fontFamily: "Anton, sans-serif",
            fontSize: 44,
            lineHeight: 1.05,
            marginBottom: 16,
            letterSpacing: ".01em",
          }}
        >
          Delete your account
        </h1>

        <p style={{ fontSize: 16, opacity: 0.8, lineHeight: 1.7, marginBottom: 32 }}>
          Submit this form and we'll permanently delete your TrendyWheels account within{" "}
          <strong>30 days</strong>. You'll receive a confirmation email when it's done. If you
          prefer to email us directly:{" "}
          <a href="mailto:privacy@trendywheelseg.com" style={{ color: "#A9F453" }}>
            privacy@trendywheelseg.com
          </a>
          .
        </p>

        {status === "done" ? (
          <div
            style={{
              padding: 24,
              borderRadius: 14,
              background: "rgba(169, 244, 83, .08)",
              border: "1px solid rgba(169, 244, 83, .3)",
            }}
          >
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>Request received</h2>
            <p style={{ opacity: 0.8 }}>
              We've logged your deletion request. You'll get an email at the address you provided
              within 30 days confirming everything is gone.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field
              label="Email used on your account"
              type="email"
              required
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
            />
            <Field
              label="Phone number used on your account"
              type="tel"
              required
              value={phone}
              onChange={setPhone}
              placeholder="+20 1XX XXX XXXX"
            />
            <TextareaField
              label="Reason (optional)"
              value={reason}
              onChange={setReason}
              placeholder="Tell us why if you like — helps us improve."
            />

            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginTop: 8,
                color: "#A9F453",
                textTransform: "uppercase",
                letterSpacing: ".12em",
              }}
            >
              What gets deleted
            </h3>
            <ul style={{ fontSize: 15, opacity: 0.75, lineHeight: 1.7, paddingLeft: 20 }}>
              <li>Your name, email, phone, address, profile photo, driver's-license photo</li>
              <li>Your saved payment methods and addresses</li>
              <li>Your messages with our support team</li>
            </ul>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginTop: 16,
                color: "#FF0065",
                textTransform: "uppercase",
                letterSpacing: ".12em",
              }}
            >
              What we keep
            </h3>
            <ul style={{ fontSize: 15, opacity: 0.75, lineHeight: 1.7, paddingLeft: 20 }}>
              <li>Anonymized booking + sale records (legal/tax retention, 7 years)</li>
              <li>Anonymized payment receipts (regulatory requirement)</li>
            </ul>

            {status === "error" && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "rgba(255, 0, 0, .08)",
                  border: "1px solid rgba(255, 0, 0, .3)",
                  color: "#FFB4B4",
                  fontSize: 14,
                }}
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              style={{
                marginTop: 16,
                padding: "16px 24px",
                borderRadius: 12,
                background: status === "submitting" ? "#6b21a8" : "#2B0FF8",
                color: "#fff",
                border: "none",
                fontSize: 16,
                fontWeight: 600,
                cursor: status === "submitting" ? "wait" : "pointer",
                letterSpacing: ".02em",
              }}
            >
              {status === "submitting" ? "Sending…" : "Request account deletion"}
            </button>

            <p style={{ fontSize: 13, opacity: 0.5, marginTop: 8 }}>
              We'll verify the request matches an account we hold. If the email + phone don't match
              any account, we'll still log the request and follow up by email.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.65, letterSpacing: ".02em" }}>{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.12)",
          background: "rgba(255,255,255,.04)",
          color: "#fff",
          fontSize: 15,
          outline: "none",
        }}
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.65, letterSpacing: ".02em" }}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.12)",
          background: "rgba(255,255,255,.04)",
          color: "#fff",
          fontSize: 15,
          outline: "none",
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />
    </label>
  );
}
