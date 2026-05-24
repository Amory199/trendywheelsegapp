"use client";

import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { useState } from "react";
import type { JSX } from "react";

import { ACCESS_KEY, baseUrl, readToken } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-store";

export default function PrivacyPage(): JSX.Element {
  const { user } = useAuth();
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!user) return <div style={{ padding: 24 }}>Sign in to manage privacy.</div>;

  const onExport = async (): Promise<void> => {
    setBusy("export");
    setMsg(null);
    try {
      const res = await fetch(`${baseUrl}/api/users/${user.id}/export`, {
        headers: { Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}` },
      });
      if (!res.ok) throw new Error("Failed to start export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trendywheels-data-${user.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Export downloaded.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 720, margin: "0 auto", padding: "8px 0" }}>
      <h1
        style={{
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: "clamp(2rem, 7vw, 3rem)",
          textTransform: "uppercase",
          margin: 0,
          color: colors.brand.trustWorth,
        }}
      >
        Privacy<span style={{ color: colors.brand.trendyPink }}>.</span>
      </h1>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 16,
          padding: 20,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1A1933" }}>Download my data</div>
          <p style={{ fontSize: 13, color: "#6B6A85", margin: "4px 0 12px" }}>
            Get a JSON file with your account, bookings, listings, repair requests, messages, and
            loyalty history.
          </p>
          <button
            onClick={onExport}
            disabled={busy === "export"}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: colors.brand.friendlyBlue,
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              opacity: busy === "export" ? 0.6 : 1,
            }}
          >
            {busy === "export" ? "Preparing…" : "Download my data"}
          </button>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 16,
          padding: 20,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1A1933" }}>Delete my account</div>
          <p style={{ fontSize: 13, color: "#6B6A85", margin: "4px 0 12px" }}>
            Submit a deletion request. Your account is removed within 30 days; you’ll get a
            confirmation email first.
          </p>
          <Link
            href="/account/delete"
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: colors.brand.ultraRed ?? "#D43F3F",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 700,
              display: "inline-block",
            }}
          >
            Request deletion
          </Link>
        </div>
      </div>

      {msg ? <div style={{ fontSize: 13, color: "#1A1933" }}>{msg}</div> : null}
    </div>
  );
}
