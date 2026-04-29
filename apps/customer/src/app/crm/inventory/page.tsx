"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";

import { authedFetch } from "../../../lib/fetcher";

interface InventoryVehicle {
  id: string;
  name: string;
  type: "4-seater" | "6-seater" | "LED";
  seating: number;
  fuelType: string;
  transmission: string;
  dailyRate: string | number;
  location: string;
  status: "available" | "rented" | "maintenance" | "inactive";
  features: string[];
  images: Array<{ url: string }>;
}

interface MyLead {
  id: string;
  contactName: string;
  status: string;
}

const TYPES: Array<{ value: string; label: string; color: string }> = [
  { value: "", label: "All carts", color: colors.brand.friendlyBlue },
  { value: "4-seater", label: "4-seater", color: colors.brand.poolBlue },
  { value: "6-seater", label: "6-seater", color: colors.brand.friendlyBlue },
  { value: "LED", label: "LED", color: colors.brand.trendyPink },
];

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  available: { bg: "rgba(169,244,83,0.18)", fg: "#3F7B0E" },
  rented: { bg: "rgba(255,0,101,0.12)", fg: colors.brand.trendyPink },
  maintenance: { bg: "rgba(255,165,0,0.16)", fg: "#A66200" },
  inactive: { bg: "#ECECF1", fg: "#9E9DAE" },
};

export default function CrmInventoryPage(): JSX.Element {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "available" | "rented">("");

  const inv = useQuery<{ data: InventoryVehicle[] }>({
    queryKey: ["crm-inventory", typeFilter, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (typeFilter) p.set("type", typeFilter);
      if (statusFilter) p.set("status", statusFilter);
      return authedFetch(`/api/crm/inventory${p.toString() ? `?${p}` : ""}`);
    },
  });

  const myLeads = useQuery<{ data: MyLead[] }>({
    queryKey: ["crm-leads-mine-active"],
    queryFn: () => authedFetch("/api/crm/leads?mine=1"),
  });

  const attach = useMutation({
    mutationFn: (body: { leadId: string; vehicleId: string; intent: "rent" | "sell" }) =>
      authedFetch("/api/crm/inventory/attach", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["crm-leads"] });
      void qc.invalidateQueries({ queryKey: ["crm-pipeline"] });
    },
  });

  const vehicles = inv.data?.data ?? [];
  const leads = (myLeads.data?.data ?? []).filter((l) => !["won", "lost"].includes(l.status));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.brand.trendyPink, letterSpacing: "0.12em" }}>
          INVENTORY
        </span>
        <h1 style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 36, margin: "4px 0 0", textTransform: "uppercase" }}>
          Golf carts in stock<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
        <p style={{ color: "#6B6A85", marginTop: 4, fontSize: 14 }}>
          {vehicles.length} carts · match one to a lead in two clicks
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, padding: 4, background: "#fff", border: "1px solid #ECECF1", borderRadius: 12 }}>
          {TYPES.map((t) => (
            <button
              key={t.value || "all"}
              onClick={() => setTypeFilter(t.value)}
              className="tw-press"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: typeFilter === t.value ? t.color : "transparent",
                color: typeFilter === t.value ? "#fff" : "#4B4A6B",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, padding: 4, background: "#fff", border: "1px solid #ECECF1", borderRadius: 12 }}>
          {(["", "available", "rented"] as const).map((s) => (
            <button
              key={s || "all-status"}
              onClick={() => setStatusFilter(s)}
              className="tw-press"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: statusFilter === s ? colors.brand.ecoLimelight : "transparent",
                color: statusFilter === s ? colors.brand.trustWorth : "#4B4A6B",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                cursor: "pointer",
              }}
            >
              {s || "Any status"}
            </button>
          ))}
        </div>
      </div>

      <div className="tw-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {vehicles.map((v) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            leads={leads}
            attaching={attach.isPending}
            onAttach={(leadId, intent) => attach.mutate({ leadId, vehicleId: v.id, intent })}
          />
        ))}
        {!vehicles.length && !inv.isLoading ? (
          <div style={{ gridColumn: "1 / -1", padding: 32, textAlign: "center", color: "#6B6A85", fontSize: 13, background: "#fff", borderRadius: 12, border: "1px solid #ECECF1" }}>
            No golf carts match those filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VehicleCard({
  vehicle,
  leads,
  onAttach,
  attaching,
}: {
  vehicle: InventoryVehicle;
  leads: MyLead[];
  onAttach: (leadId: string, intent: "rent" | "sell") => void;
  attaching: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const cover = vehicle.images?.[0]?.url ?? `https://picsum.photos/seed/golf-cart-${vehicle.id.slice(0, 8)}/600/400`;
  const statusStyle = STATUS_STYLES[vehicle.status] ?? STATUS_STYLES.available;

  return (
    <div className="tw-card-lift" style={{ background: "#fff", border: "1px solid #ECECF1", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", aspectRatio: "16/10", background: "#F4F4F7" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt={vehicle.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <span style={{ position: "absolute", top: 10, left: 10, padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: statusStyle.bg, color: statusStyle.fg }}>
          {vehicle.status}
        </span>
        {vehicle.type === "LED" ? (
          <span style={{ position: "absolute", top: 10, right: 10, padding: "4px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: colors.brand.trendyPink, color: "#fff", letterSpacing: "0.06em" }}>
            LED
          </span>
        ) : null}
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{vehicle.name}</div>
        <div style={{ fontSize: 12, color: "#6B6A85" }}>
          {vehicle.seating} seats · {vehicle.fuelType} · {vehicle.location}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          {(vehicle.features ?? []).slice(0, 3).map((f) => (
            <span key={f} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: "#F4F4F7", color: "#4B4A6B" }}>
              {f}
            </span>
          ))}
        </div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 22, color: colors.brand.trendyPink }}>
              EGP {Number(vehicle.dailyRate).toLocaleString()}
            </span>
            <span style={{ fontSize: 11, color: "#6B6A85" }}> / day</span>
          </div>
        </div>

        {open ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {leads.length === 0 ? (
              <div style={{ fontSize: 11, color: "#6B6A85", padding: "8px 0" }}>You have no active leads to attach this to.</div>
            ) : (
              leads.map((l) => (
                <div key={l.id} style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => { onAttach(l.id, "rent"); setOpen(false); }}
                    disabled={attaching}
                    className="tw-press"
                    style={{ flex: 1, padding: "6px 10px", border: `1px solid ${colors.brand.friendlyBlue}`, borderRadius: 8, background: "#fff", color: colors.brand.friendlyBlue, fontSize: 11, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
                  >
                    Rent → {l.contactName}
                  </button>
                  <button
                    onClick={() => { onAttach(l.id, "sell"); setOpen(false); }}
                    disabled={attaching}
                    className="tw-press"
                    style={{ padding: "6px 10px", border: `1px solid ${colors.brand.trendyPink}`, borderRadius: 8, background: "#fff", color: colors.brand.trendyPink, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    Sell
                  </button>
                </div>
              ))
            )}
            <button
              onClick={() => setOpen(false)}
              style={{ marginTop: 4, padding: "4px 10px", border: "none", background: "transparent", color: "#9E9DAE", fontSize: 11, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            disabled={vehicle.status !== "available"}
            className="tw-press"
            style={{
              marginTop: 4,
              padding: "8px 12px",
              border: "none",
              borderRadius: 10,
              background: vehicle.status === "available" ? colors.brand.friendlyBlue : "#ECECF1",
              color: vehicle.status === "available" ? "#fff" : "#9E9DAE",
              fontSize: 12,
              fontWeight: 700,
              cursor: vehicle.status === "available" ? "pointer" : "not-allowed",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {vehicle.status === "available" ? "Attach to lead →" : "Not available"}
          </button>
        )}
      </div>
    </div>
  );
}
