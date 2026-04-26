"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface AlertConfig {
  id: string;
  utilizationMaxPct: number;
  maintenanceDueDays: number;
  maxConcurrentRepairs: number;
  updatedAt: string;
}

export default function AdminAlertsPage(): JSX.Element {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-alert-config"],
    queryFn: () => authedFetch<{ data: AlertConfig }>("/api/inventory/alert-config"),
  });

  const [draft, setDraft] = useState({
    utilizationMaxPct: 80,
    maintenanceDueDays: 7,
    maxConcurrentRepairs: 5,
  });

  useEffect(() => {
    if (data?.data) {
      setDraft({
        utilizationMaxPct: data.data.utilizationMaxPct,
        maintenanceDueDays: data.data.maintenanceDueDays,
        maxConcurrentRepairs: data.data.maxConcurrentRepairs,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (body: typeof draft) =>
      authedFetch("/api/inventory/alert-config", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-alert-config"] }),
  });

  interface AlertEventRow {
    id: string;
    type: string;
    severity: "info" | "warning" | "critical";
    message: string;
    createdAt: string;
    vehicle?: { id: string; name: string } | null;
  }

  const eventsQ = useQuery({
    queryKey: ["admin-alert-events"],
    queryFn: () =>
      authedFetch<{ data: AlertEventRow[] }>("/api/inventory/alert-events?resolved=false"),
    refetchInterval: 30_000,
  });

  const resolveEvent = useMutation({
    mutationFn: (id: string) =>
      authedFetch(`/api/inventory/alert-events/${id}/resolve`, { method: "POST" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-alert-events"] }),
  });

  const events = eventsQ.data?.data ?? [];

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Operational Alerts</h1>
        <p className="text-sm text-gray-500">
          Thresholds that trigger fleet, maintenance, and repair alerts across the platform.
        </p>
      </header>

      <section>
        <h2 className="font-semibold mb-2">Active alerts ({events.length})</h2>
        <div className="bg-white border rounded-lg divide-y">
          {eventsQ.isLoading ? (
            <div className="p-4 text-sm text-gray-400 text-center">Loading…</div>
          ) : events.length === 0 ? (
            <div className="p-6 text-sm text-gray-400 text-center">
              No active alerts. Fleet is operating within all thresholds.
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
                <button
                  onClick={() => resolveEvent.mutate(e.id)}
                  disabled={resolveEvent.isPending}
                  className="text-xs px-3 py-1.5 border border-blue-500 text-blue-600 hover:bg-blue-50 rounded-md font-medium disabled:opacity-40"
                >
                  Resolve
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white border rounded-lg p-6 space-y-5">
          <ThresholdField
            label="Utilization alert"
            help="Vehicles over this rented percentage are flagged."
            unit="%"
            min={0}
            max={100}
            value={draft.utilizationMaxPct}
            onChange={(v) => setDraft((d) => ({ ...d, utilizationMaxPct: v }))}
          />
          <ThresholdField
            label="Maintenance due window"
            help="Days before a scheduled maintenance triggers a warning."
            unit="days"
            min={1}
            max={365}
            value={draft.maintenanceDueDays}
            onChange={(v) => setDraft((d) => ({ ...d, maintenanceDueDays: v }))}
          />
          <ThresholdField
            label="Max concurrent repairs"
            help="If a vehicle exceeds this number of open repairs, alert ops."
            unit="repairs"
            min={0}
            max={1000}
            value={draft.maxConcurrentRepairs}
            onChange={(v) => setDraft((d) => ({ ...d, maxConcurrentRepairs: v }))}
          />

          <div className="flex items-center gap-3 pt-2 border-t">
            <button
              onClick={() => saveMutation.mutate(draft)}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-40"
            >
              {saveMutation.isPending ? "Saving…" : "Save thresholds"}
            </button>
            {saveMutation.isSuccess && (
              <span className="text-xs text-green-600">Saved.</span>
            )}
            {saveMutation.isError && (
              <span className="text-xs text-red-600">Failed to save.</span>
            )}
            {data?.data && (
              <span className="text-xs text-gray-400 ml-auto">
                Last updated {new Date(data.data.updatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThresholdField({
  label,
  help,
  unit,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  help: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}): JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-4 items-start">
      <div className="col-span-2">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-gray-500 mt-1">{help}</div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>
    </div>
  );
}
