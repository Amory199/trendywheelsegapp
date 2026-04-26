"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface RepairRow {
  id: string;
  category: string;
  priority: string;
  status: "submitted" | "assigned" | "in-progress" | "completed";
  description: string;
  preferredDate: string | null;
  createdAt: string;
}

interface VehicleRow {
  id: string;
  name: string;
}

const STATUS_LABEL: Record<RepairRow["status"], { fg: string; bg: string }> = {
  submitted: { bg: "#E6F0FF", fg: "#1338A8" },
  assigned: { bg: "#F0E5FF", fg: "#5300A8" },
  "in-progress": { bg: "#FFF4D6", fg: "#806000" },
  completed: { bg: "#E6F8E6", fg: "#0A6B0A" },
};

const CATEGORIES = ["mechanical", "electrical", "cosmetic", "other"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

export default function RepairPage(): JSX.Element {
  const qc = useQueryClient();

  const repairsQ = useQuery({
    queryKey: ["customer-repairs"],
    queryFn: () => authedFetch<{ data: RepairRow[] }>("/api/repairs?limit=20"),
  });

  const vehiclesQ = useQuery({
    queryKey: ["customer-repair-vehicles"],
    queryFn: () => authedFetch<{ data: VehicleRow[] }>("/api/vehicles?limit=50"),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    vehicleId: "",
    category: "mechanical",
    priority: "medium",
    description: "",
    preferredDate: "",
  });

  const submit = useMutation({
    mutationFn: () =>
      authedFetch("/api/repairs", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          preferredDate: form.preferredDate ? new Date(form.preferredDate).toISOString() : undefined,
        }),
      }),
    onSuccess: () => {
      setShowForm(false);
      setForm({ vehicleId: "", category: "mechanical", priority: "medium", description: "", preferredDate: "" });
      void qc.invalidateQueries({ queryKey: ["customer-repairs"] });
    },
  });

  const repairs = repairsQ.data?.data ?? [];
  const vehicles = vehiclesQ.data?.data ?? [];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1
            style={{
              fontFamily: "Anton, Impact, system-ui, sans-serif",
              fontSize: 48,
              textTransform: "uppercase",
              margin: 0,
              color: colors.brand.trustWorth,
            }}
          >
            Repair & service
            <span style={{ color: colors.brand.trendyPink }}>.</span>
          </h1>
          <p style={{ color: "#6B6A85", marginTop: 6 }}>Trusted mechanics. Real-time progress.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: "12px 22px",
            borderRadius: 12,
            background: colors.brand.trendyPink,
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
          }}
        >
          {showForm ? "Close" : "+ Request repair"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", border: "1px solid #ECECF1", borderRadius: 16, padding: 24, display: "grid", gap: 14 }}>
          <h3 style={{ margin: 0 }}>New repair request</h3>
          <Select label="Vehicle" value={form.vehicleId} onChange={(v) => setForm((f) => ({ ...f, vehicleId: v }))}>
            <option value="">Select vehicle…</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Select label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select label="Priority" value={form.priority} onChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <Field
            label="Preferred date (optional)"
            type="date"
            value={form.preferredDate}
            onChange={(v) => setForm((f) => ({ ...f, preferredDate: v }))}
          />
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#4B4A6B", letterSpacing: 0.4, textTransform: "uppercase" }}>
              Description
            </span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What needs fixing?"
              style={{
                padding: 12,
                borderRadius: 10,
                border: "1px solid #ECECF1",
                fontSize: 14,
                fontFamily: "inherit",
                resize: "vertical",
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
            disabled={!form.vehicleId || form.description.length < 10 || submit.isPending}
            style={{
              padding: 12,
              border: "none",
              borderRadius: 12,
              background: colors.brand.friendlyBlue,
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              opacity: form.vehicleId && form.description.length >= 10 ? 1 : 0.5,
            }}
          >
            {submit.isPending ? "Submitting…" : "Submit request"}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {repairsQ.isLoading ? (
          <div style={{ color: "#6B6A85" }}>Loading…</div>
        ) : repairs.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: "#6B6A85" }}>
            No repairs yet.
          </div>
        ) : (
          repairs.map((r) => {
            const tone = STATUS_LABEL[r.status] ?? STATUS_LABEL.submitted;
            return (
              <div
                key={r.id}
                style={{
                  background: "#fff",
                  border: "1px solid #ECECF1",
                  borderRadius: 16,
                  padding: 18,
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "#F0F0F8",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 22,
                  }}
                >
                  🔧
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        background: tone.bg,
                        color: tone.fg,
                        textTransform: "capitalize",
                      }}
                    >
                      {r.status.replace("-", " ")}
                    </span>
                    <span style={{ fontSize: 11, color: "#6B6A85", textTransform: "capitalize" }}>
                      {r.category} · {r.priority}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14 }}>{r.description}</p>
                  <p style={{ fontSize: 11, color: "#6B6A85", marginTop: 6 }}>
                    Submitted {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#4B4A6B", letterSpacing: 0.4, textTransform: "uppercase" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #ECECF1", fontSize: 14, fontFamily: "inherit" }}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#4B4A6B", letterSpacing: 0.4, textTransform: "uppercase" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #ECECF1", fontSize: 14, fontFamily: "inherit", background: "#fff", textTransform: "capitalize" }}
      >
        {children}
      </select>
    </label>
  );
}
