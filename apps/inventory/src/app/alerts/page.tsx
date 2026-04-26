"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RepairRequest, Vehicle } from "@trendywheels/types";
import Link from "next/link";
import { useEffect, useState } from "react";

import { api, baseUrl, readToken, ACCESS_KEY } from "../../lib/api";

interface AlertConfigResponse {
  data: {
    id: string;
    utilizationMaxPct: number;
    maintenanceDueDays: number;
    maxConcurrentRepairs: number;
    updatedAt: string;
  };
}

async function fetchAlertConfig(): Promise<AlertConfigResponse> {
  const res = await fetch(`${baseUrl}/api/inventory/alert-config`, {
    headers: { Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}` },
  });
  if (!res.ok) throw new Error("Failed to load alert config");
  return res.json();
}

async function patchAlertConfig(body: Partial<AlertConfigResponse["data"]>): Promise<AlertConfigResponse> {
  const res = await fetch(`${baseUrl}/api/inventory/alert-config`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to save alert config");
  return res.json();
}

interface AlertThresholds {
  utilizationPercent: number;
  maintenanceDueDays: number;
  maxOpenRepairs: number;
}

type AlertSeverity = "critical" | "warning" | "info";

interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  link?: string;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { badge: string; icon: string; border: string }> = {
  critical: { badge: "bg-red-100 text-red-700", icon: "🔴", border: "border-l-red-500" },
  warning: { badge: "bg-yellow-100 text-yellow-700", icon: "🟡", border: "border-l-yellow-500" },
  info: { badge: "bg-blue-100 text-blue-700", icon: "🔵", border: "border-l-blue-500" },
};

export default function AlertsPage(): JSX.Element {
  const qc = useQueryClient();
  const configQ = useQuery({
    queryKey: ["alert-config"],
    queryFn: fetchAlertConfig,
  });

  const cfg = configQ.data?.data;
  const thresholds: AlertThresholds = {
    utilizationPercent: cfg?.utilizationMaxPct ?? 80,
    maintenanceDueDays: cfg?.maintenanceDueDays ?? 7,
    maxOpenRepairs: cfg?.maxConcurrentRepairs ?? 5,
  };
  const [editingThresholds, setEditingThresholds] = useState(false);
  const [draftThresholds, setDraftThresholds] = useState<AlertThresholds>(thresholds);

  useEffect(() => {
    if (cfg) {
      setDraftThresholds({
        utilizationPercent: cfg.utilizationMaxPct,
        maintenanceDueDays: cfg.maintenanceDueDays,
        maxOpenRepairs: cfg.maxConcurrentRepairs,
      });
    }
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: () =>
      patchAlertConfig({
        utilizationMaxPct: draftThresholds.utilizationPercent,
        maintenanceDueDays: draftThresholds.maintenanceDueDays,
        maxConcurrentRepairs: draftThresholds.maxOpenRepairs,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alert-config"] });
      setEditingThresholds(false);
    },
  });

  const { data: vehicleData } = useQuery({
    queryKey: ["vehicles-alerts"],
    queryFn: () => api.getVehicles({ limit: 200 }),
    refetchInterval: 60_000,
  });

  const { data: repairData } = useQuery({
    queryKey: ["repairs-alerts"],
    queryFn: () => api.getRepairRequests({ limit: 200 }),
    refetchInterval: 60_000,
  });

  const vehicles = (vehicleData?.data ?? []) as Vehicle[];
  const repairs = (repairData?.data ?? []) as RepairRequest[];

  const total = vehicles.length;
  const rented = vehicles.filter((v) => v.status === "rented").length;
  const utilization = total > 0 ? Math.round((rented / total) * 100) : 0;
  const inMaintenance = vehicles.filter((v) => v.status === "maintenance").length;
  const openRepairs = repairs.filter(
    (r) => r.status === "submitted" || r.status === "assigned" || r.status === "in-progress",
  );
  const urgentRepairs = repairs.filter((r) => r.priority === "urgent" && r.status !== "completed");

  const alerts: Alert[] = [];

  if (utilization >= thresholds.utilizationPercent) {
    alerts.push({
      id: "utilization",
      severity: utilization >= 95 ? "critical" : "warning",
      title: `Fleet utilization at ${utilization}%`,
      description: `${rented} of ${total} vehicles are currently rented. Consider adding more vehicles to the fleet.`,
    });
  }

  if (inMaintenance >= 3) {
    alerts.push({
      id: "maintenance-high",
      severity: inMaintenance >= 5 ? "critical" : "warning",
      title: `${inMaintenance} vehicles in maintenance`,
      description: "High number of vehicles off-road for maintenance is reducing available fleet capacity.",
      link: "/availability",
    });
  }

  if (openRepairs.length > thresholds.maxOpenRepairs) {
    alerts.push({
      id: "open-repairs",
      severity: "warning",
      title: `${openRepairs.length} open repair requests`,
      description: `${openRepairs.length} repair requests are pending or in progress — exceeds threshold of ${thresholds.maxOpenRepairs}.`,
      link: "/maintenance",
    });
  }

  urgentRepairs.forEach((r) => {
    alerts.push({
      id: `urgent-${r.id}`,
      severity: "critical",
      title: `Urgent repair: ${r.category}`,
      description: r.description.slice(0, 120),
      link: "/maintenance",
    });
  });

  const availableVehicles = vehicles.filter((v) => v.status === "available");
  if (availableVehicles.length === 0 && total > 0) {
    alerts.push({
      id: "no-available",
      severity: "critical",
      title: "No vehicles available for booking",
      description: "All vehicles are rented or in maintenance. Customers cannot make new bookings.",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "all-good",
      severity: "info",
      title: "All systems normal",
      description: `Fleet utilization is ${utilization}%. No threshold breaches detected.`,
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Stock Alerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {alerts.filter((a) => a.severity !== "info").length} active alerts
          </p>
        </div>
        <button
          onClick={() => {
            setDraftThresholds(thresholds);
            setEditingThresholds((v) => !v);
          }}
          className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-sm font-medium rounded-md transition"
        >
          ⚙️ Thresholds
        </button>
      </div>

      {/* Threshold editor */}
      {editingThresholds && (
        <div className="bg-white rounded-xl border p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-sm">Alert Thresholds</h2>
          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 block mb-1">
                Utilization alert (%)
              </span>
              <input
                type="number"
                min={10}
                max={100}
                value={draftThresholds.utilizationPercent}
                onChange={(e) =>
                  setDraftThresholds((d) => ({
                    ...d,
                    utilizationPercent: Number(e.target.value),
                  }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 block mb-1">
                Maintenance due (days)
              </span>
              <input
                type="number"
                min={1}
                max={90}
                value={draftThresholds.maintenanceDueDays}
                onChange={(e) =>
                  setDraftThresholds((d) => ({
                    ...d,
                    maintenanceDueDays: Number(e.target.value),
                  }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 block mb-1">
                Max open repairs
              </span>
              <input
                type="number"
                min={1}
                max={50}
                value={draftThresholds.maxOpenRepairs}
                onChange={(e) =>
                  setDraftThresholds((d) => ({
                    ...d,
                    maxOpenRepairs: Number(e.target.value),
                  }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setDraftThresholds(thresholds);
                setEditingThresholds(false);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded-md transition"
            >
              Cancel
            </button>
          </div>
          {saveMutation.isError ? (
            <p className="text-sm text-red-600 mt-2">Failed to save. Try again.</p>
          ) : null}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-1">Total Fleet</div>
          <div className="text-3xl font-bold">{total}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-1">Utilization</div>
          <div
            className={`text-3xl font-bold ${utilization >= thresholds.utilizationPercent ? "text-red-600" : "text-emerald-600"}`}
          >
            {utilization}%
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-1">In Maintenance</div>
          <div className={`text-3xl font-bold ${inMaintenance >= 3 ? "text-orange-600" : "text-gray-800"}`}>
            {inMaintenance}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-1">Open Repairs</div>
          <div
            className={`text-3xl font-bold ${openRepairs.length > thresholds.maxOpenRepairs ? "text-red-600" : "text-gray-800"}`}
          >
            {openRepairs.length}
          </div>
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {alerts.map((alert) => {
          const cfg = SEVERITY_CONFIG[alert.severity];
          return (
            <div
              key={alert.id}
              className={`bg-white rounded-xl border border-l-4 ${cfg.border} p-4`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg">{cfg.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{alert.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{alert.description}</p>
                  </div>
                </div>
                {alert.link && (
                  <Link
                    href={alert.link}
                    className="shrink-0 text-emerald-600 hover:underline text-sm font-medium"
                  >
                    View →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert event feed (real, from BullMQ alert-evaluator) */}
      <AlertEventFeed />
    </div>
  );
}

interface AlertEventRow {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  createdAt: string;
  resolvedAt: string | null;
  vehicle?: { id: string; name: string; type: string } | null;
}

function AlertEventFeed(): JSX.Element {
  const qc = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);

  const eventsQ = useQuery({
    queryKey: ["alert-events", showResolved],
    queryFn: async () => {
      const res = await fetch(
        `${baseUrl}/api/inventory/alert-events?resolved=${showResolved ? "true" : "false"}`,
        { headers: { Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}` } },
      );
      if (!res.ok) throw new Error("Failed to load alerts");
      return res.json() as Promise<{ data: AlertEventRow[] }>;
    },
    refetchInterval: 30_000,
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${baseUrl}/api/inventory/alert-events/${id}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}` },
      });
      if (!res.ok) throw new Error("Failed to resolve");
      return res.json();
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["alert-events"] }),
  });

  const events = eventsQ.data?.data ?? [];

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">
          {showResolved ? "Resolved Alerts" : "Active Alerts"}
        </h2>
        <button
          onClick={() => setShowResolved((v) => !v)}
          className="text-xs text-emerald-600 hover:underline"
        >
          {showResolved ? "Show active →" : "Show resolved →"}
        </button>
      </div>
      <div className="bg-white rounded-xl border divide-y">
        {eventsQ.isLoading ? (
          <div className="p-4 text-sm text-gray-400 text-center">Loading…</div>
        ) : events.length === 0 ? (
          <div className="p-6 text-sm text-gray-400 text-center">
            {showResolved ? "No resolved alerts." : "No active alerts. Fleet looks healthy."}
          </div>
        ) : (
          events.map((e) => (
            <div key={e.id} className="p-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                      e.severity === "critical"
                        ? "bg-red-100 text-red-700"
                        : e.severity === "warning"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {e.severity}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">
                    {e.type.replaceAll("-", " ")}
                  </span>
                </div>
                <p className="text-sm text-gray-800">{e.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {e.vehicle && `${e.vehicle.name} · `}
                  {new Date(e.createdAt).toLocaleString()}
                </p>
              </div>
              {!e.resolvedAt && (
                <button
                  onClick={() => resolveMutation.mutate(e.id)}
                  disabled={resolveMutation.isPending}
                  className="text-xs px-3 py-1.5 border border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-md font-medium disabled:opacity-40"
                >
                  Resolve
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
