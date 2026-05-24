"use client";

import { useMutation } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { JSX } from "react";

import { authedFetch } from "../../../lib/fetcher";

export default function TransportPage(): JSX.Element {
  const router = useRouter();
  const [fromAddress, setFrom] = useState("");
  const [toAddress, setTo] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [cargoNotes, setCargoNotes] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      authedFetch<{ data: { id: string } }>("/api/transport", {
        method: "POST",
        body: JSON.stringify({
          fromAddress,
          toAddress,
          pickupAt: new Date(pickupAt).toISOString(),
          cargoNotes,
        }),
      }),
    onSuccess: () => router.push("/profile?tab=transport"),
  });

  const canSubmit = fromAddress.trim() && toAddress.trim() && pickupAt;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.6 }}>
        Service · Transportation
      </div>
      <h1
        style={{
          fontFamily: "Anton, sans-serif",
          fontSize: "clamp(36px, 6vw, 52px)",
          margin: "8px 0 6px",
          lineHeight: 1,
        }}
      >
        Where to,
        <br />
        <span style={{ color: colors.brand.trendyPink }}>and when?</span>
      </h1>
      <div style={{ fontSize: 14, opacity: 0.65, marginBottom: 24 }}>
        We&apos;ll confirm with a price and driver within an hour.
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <Field
          label="Pickup address"
          value={fromAddress}
          onChange={setFrom}
          placeholder="Marassi Marina, Gate 4"
        />
        <Field
          label="Drop-off address"
          value={toAddress}
          onChange={setTo}
          placeholder="El Gouna Hotel, Reception"
        />
        <Field
          label="Pickup date + time"
          value={pickupAt}
          onChange={setPickupAt}
          type="datetime-local"
        />
        <div>
          <Label>Cargo notes (optional)</Label>
          <textarea
            value={cargoNotes}
            onChange={(e) => setCargoNotes(e.target.value)}
            rows={3}
            placeholder="Number of passengers, luggage, anything specific…"
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </div>
        <button
          onClick={() => submit.mutate()}
          disabled={!canSubmit || submit.isPending}
          className="tw-press"
          style={{
            marginTop: 8,
            padding: "14px 22px",
            borderRadius: 12,
            border: "none",
            background:
              !canSubmit || submit.isPending ? "rgba(2,1,31,0.2)" : colors.brand.friendlyBlue,
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: !canSubmit || submit.isPending ? "not-allowed" : "pointer",
          }}
        >
          {submit.isPending ? "Submitting…" : "Request transport"}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(2,1,31,0.12)",
  background: "#fff",
  fontSize: 15,
  fontFamily: "inherit",
  color: colors.brand.trustWorth,
  outline: "none",
};

function Label({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, letterSpacing: 0.4 }}>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}): JSX.Element {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, marginTop: 6 }}
      />
    </div>
  );
}
