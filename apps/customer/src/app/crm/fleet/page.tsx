"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";

import { ACCESS_KEY, baseUrl, readToken } from "../../../lib/api";

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

interface Vehicle {
  id: string;
  name: string;
  type: string;
  status: "available" | "rented" | "maintenance" | "inactive";
  location: string;
  dailyRate: number | string;
  totalBookings: number;
  averageRating: number | string | null;
  images?: { url: string; sortOrder: number }[];
}

interface AlertEvent {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  vehicleId: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

const STATUS_TONE: Record<Vehicle["status"], { bg: string; fg: string; label: string }> = {
  available: { bg: "#D6F5DC", fg: "#1F6E00", label: "Available" },
  rented: { bg: "#FFE4E1", fg: "#FF0065", label: "Rented" },
  maintenance: { bg: "#FFF3D6", fg: "#A87800", label: "Maintenance" },
  inactive: { bg: "#E5E7EB", fg: "#6B6A85", label: "Inactive" },
};

const SEVERITY_TONE: Record<AlertEvent["severity"], { bg: string; fg: string }> = {
  critical: { bg: "#FF0000", fg: "#fff" },
  warning: { bg: "#F5B800", fg: "#02011F" },
  info: { bg: "#00C7EA", fg: "#02011F" },
};

export default function CrmFleetPage(): JSX.Element {
  const qc = useQueryClient();

  const vehiclesQ = useQuery<{ data: Vehicle[] }>({
    queryKey: ["crm-fleet"],
    queryFn: () => authedFetch<{ data: Vehicle[] }>("/api/vehicles?limit=100"),
  });

  const alertsQ = useQuery<{ data: AlertEvent[] }>({
    queryKey: ["crm-alert-events"],
    queryFn: () =>
      authedFetch<{ data: AlertEvent[] }>("/api/inventory/alert-events?resolved=false"),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      authedFetch(`/api/inventory/alert-events/${id}/resolve`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-alert-events"] }),
  });

  const vehicles = vehiclesQ.data?.data ?? [];
  const alerts = alertsQ.data?.data ?? [];

  const counts = {
    available: vehicles.filter((v) => v.status === "available").length,
    rented: vehicles.filter((v) => v.status === "rented").length,
    maintenance: vehicles.filter((v) => v.status === "maintenance").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <header>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.brand.trendyPink,
            letterSpacing: "0.12em",
          }}
        >
          FLEET OPERATIONS
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 30,
            margin: "4px 0 0",
            textTransform: "uppercase",
            color: colors.brand.trustWorth,
          }}
        >
          Your fleet, in motion<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
        <p style={{ color: "#6B6A85", marginTop: 4, fontSize: 13 }}>
          {vehicles.length} carts · {counts.available} available · {counts.rented} rented ·{" "}
          {counts.maintenance} in maintenance · {alerts.length} open alerts
        </p>
      </header>

      {alerts.length > 0 ? (
        <section>
          <h3 style={{ fontSize: 14, marginBottom: 8, color: "#02011F" }}>Open alerts</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "#fff",
                  border: "1px solid #ECECF1",
                  borderRadius: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: SEVERITY_TONE[a.severity].bg,
                    color: SEVERITY_TONE[a.severity].fg,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  {a.severity}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: "#02011F" }}>{a.message}</span>
                <span style={{ fontSize: 11, color: "#6B6A85" }}>
                  {new Date(a.createdAt).toLocaleString()}
                </span>
                <button
                  onClick={() => resolveMutation.mutate(a.id)}
                  disabled={resolveMutation.isPending}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #A9F453",
                    background: "#fff",
                    color: "#1F6E00",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 style={{ fontSize: 14, marginBottom: 8, color: "#02011F" }}>Carts</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {vehicles.map((v) => {
            const tone = STATUS_TONE[v.status];
            const img = v.images?.[0]?.url;
            return (
              <div
                key={v.id}
                style={{
                  background: "#fff",
                  border: "1px solid #ECECF1",
                  borderRadius: 14,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={v.name}
                    style={{ width: "100%", height: 140, objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ height: 140, background: "#F4F4F7" }} />
                )}
                <div
                  style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ fontSize: 14 }}>{v.name}</strong>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: tone.bg,
                        color: tone.fg,
                      }}
                    >
                      {tone.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "#6B6A85" }}>
                    {v.type} · {v.location}
                  </span>
                  <span style={{ fontSize: 13, color: colors.brand.trendyPink, fontWeight: 700 }}>
                    EGP {Number(v.dailyRate).toLocaleString()} / day
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
