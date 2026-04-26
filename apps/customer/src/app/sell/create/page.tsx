"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authedFetch } from "../../../lib/fetcher";

interface FormState {
  title: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  transmission: "manual" | "automatic";
  fuelType: "gasoline" | "diesel" | "electric" | "hybrid";
  color: string;
  description: string;
}

export default function SellCreatePage(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();

  const [f, setF] = useState<FormState>({
    title: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    mileage: 0,
    price: 0,
    transmission: "automatic",
    fuelType: "gasoline",
    color: "",
    description: "",
  });

  const submit = useMutation({
    mutationFn: () =>
      authedFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify(f),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["customer-sell-list"] });
      router.replace("/sell?just_listed=1");
    },
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
    setF((prev) => ({ ...prev, [key]: value }));

  const valid =
    f.title.length >= 5 &&
    f.make &&
    f.model &&
    f.color &&
    f.description.length >= 10 &&
    f.mileage > 0 &&
    f.price > 0;

  return (
    <div style={{ maxWidth: 720 }}>
      <h1
        style={{
          fontFamily: "Anton, Impact, system-ui, sans-serif",
          fontSize: 44,
          textTransform: "uppercase",
          margin: 0,
          color: colors.brand.trustWorth,
        }}
      >
        List a car
        <span style={{ color: colors.brand.trendyPink }}>.</span>
      </h1>
      <p style={{ color: "#6B6A85", marginTop: 6, marginBottom: 24 }}>
        Tell us about your car — we&apos;ll show it to thousands of buyers.
      </p>

      <div style={{ display: "grid", gap: 16, background: "#fff", padding: 28, borderRadius: 16, border: "1px solid #ECECF1" }}>
        <Field label="Listing title" value={f.title} onChange={(v) => update("title", v)} placeholder="e.g. 2021 Toyota Camry — Low Mileage" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Make" value={f.make} onChange={(v) => update("make", v)} placeholder="Toyota" />
          <Field label="Model" value={f.model} onChange={(v) => update("model", v)} placeholder="Camry" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <NumField label="Year" value={f.year} onChange={(v) => update("year", v)} />
          <NumField label="Mileage (km)" value={f.mileage} onChange={(v) => update("mileage", v)} />
          <NumField label="Price (EGP)" value={f.price} onChange={(v) => update("price", v)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <SelectField
            label="Transmission"
            value={f.transmission}
            onChange={(v) => update("transmission", v as FormState["transmission"])}
            options={["automatic", "manual"]}
          />
          <SelectField
            label="Fuel"
            value={f.fuelType}
            onChange={(v) => update("fuelType", v as FormState["fuelType"])}
            options={["gasoline", "diesel", "electric", "hybrid"]}
          />
          <Field label="Color" value={f.color} onChange={(v) => update("color", v)} placeholder="White" />
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#4B4A6B", letterSpacing: 0.4, textTransform: "uppercase" }}>
            Description
          </span>
          <textarea
            value={f.description}
            onChange={(e) => update("description", e.target.value)}
            rows={5}
            placeholder="Describe the condition, history, modifications…"
            style={{
              padding: 14,
              borderRadius: 10,
              border: "1px solid #ECECF1",
              fontSize: 14,
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 100,
            }}
          />
        </label>

        {submit.isError && (
          <div style={{ fontSize: 13, color: colors.brand.ultraRed }}>
            {(submit.error as Error).message}
          </div>
        )}

        <button
          onClick={() => submit.mutate()}
          disabled={!valid || submit.isPending}
          style={{
            padding: 14,
            border: "none",
            borderRadius: 12,
            background: colors.brand.friendlyBlue,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: valid ? "pointer" : "not-allowed",
            opacity: valid && !submit.isPending ? 1 : 0.5,
            marginTop: 8,
          }}
        >
          {submit.isPending ? "Publishing…" : "Publish listing"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }): JSX.Element {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#4B4A6B", letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #ECECF1", fontSize: 14, fontFamily: "inherit" }}
      />
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }): JSX.Element {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#4B4A6B", letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</span>
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #ECECF1", fontSize: 14, fontFamily: "inherit" }}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }): JSX.Element {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#4B4A6B", letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #ECECF1", fontSize: 14, fontFamily: "inherit", background: "#fff" }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
