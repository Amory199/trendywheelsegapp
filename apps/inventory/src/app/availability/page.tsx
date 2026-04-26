"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Vehicle, VehicleType } from "@trendywheels/types";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../lib/api";

type VehicleStatus = "available" | "rented" | "maintenance" | "inactive";

const STATUS_CONFIG: Record<
  VehicleStatus,
  { label: string; dot: string; badge: string; border: string }
> = {
  available: {
    label: "Available",
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-700",
    border: "border-green-200",
  },
  rented: {
    label: "Rented",
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700",
    border: "border-blue-200",
  },
  maintenance: {
    label: "Maintenance",
    dot: "bg-yellow-500",
    badge: "bg-yellow-100 text-yellow-700",
    border: "border-yellow-200",
  },
  inactive: {
    label: "Inactive",
    dot: "bg-gray-400",
    badge: "bg-gray-100 text-gray-500",
    border: "border-gray-200",
  },
};

const STATUSES: VehicleStatus[] = ["available", "rented", "maintenance", "inactive"];
const TYPES = ["All", "4-seater", "7-seater", "pickup", "bus", "motorcycle"];

export default function AvailabilityPage(): JSX.Element {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data, isLoading } = useQuery({
    queryKey: ["vehicles", statusFilter, typeFilter],
    queryFn: () =>
      api.getVehicles({
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(typeFilter !== "All" ? { type: typeFilter as VehicleType } : {}),
        limit: 100,
      }),
    refetchInterval: 30_000,
  });

  const vehicles = (data?.data ?? []) as Vehicle[];

  const filtered = search
    ? vehicles.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()))
    : vehicles;

  const statusCounts = STATUSES.reduce<Record<string, number>>(
    (acc, s) => ({ ...acc, [s]: vehicles.filter((v) => v.status === s).length }),
    {},
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VehicleStatus }) =>
      api.updateVehicle(id, { status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vehicle Availability</h1>
          <p className="text-sm text-gray-500 mt-0.5">{vehicles.length} vehicles total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-md text-sm border transition ${viewMode === "grid" ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-300 hover:bg-gray-50"}`}
          >
            ⊞ Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-md text-sm border transition ${viewMode === "list" ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-300 hover:bg-gray-50"}`}
          >
            ☰ List
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={`bg-white rounded-xl border p-4 text-left transition hover:shadow-sm ${
                statusFilter === s ? cfg.border + " ring-2 ring-offset-1 ring-emerald-400" : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                <span className="text-xs font-medium text-gray-500">{cfg.label}</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{statusCounts[s] ?? 0}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search by make, model, or plate…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Loading fleet…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
          <span className="text-4xl">🚗</span>
          <span>No vehicles found</span>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((v) => {
            const statusKey = (v.status as VehicleStatus) in STATUS_CONFIG
              ? (v.status as VehicleStatus)
              : "inactive";
            const cfg = STATUS_CONFIG[statusKey];
            return (
              <div
                key={v.id}
                className={`bg-white rounded-xl border p-4 space-y-3 ${cfg.border}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{v.name}</div>
                    <div className="text-xs text-gray-400 capitalize">{v.type}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}
                  >
                    {cfg.label}
                  </span>
                </div>

                <div className="text-xs text-gray-500 space-y-0.5">
                  <div>{v.type} · {v.seating} seats</div>
                  <div>{v.dailyRate ? `${v.dailyRate} EGP/day` : "—"}</div>
                </div>

                <div className="flex gap-1">
                  <select
                    value={v.status}
                    onChange={(e) =>
                      updateMutation.mutate({ id: v.id, status: e.target.value as VehicleStatus })
                    }
                    className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </option>
                    ))}
                  </select>
                  <Link
                    href={`/vehicles/${v.id}/condition`}
                    className="px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-600 hover:bg-gray-50 transition"
                  >
                    📋
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Vehicle</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Plate</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Rate</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((v) => {
                const statusKey = (v.status as VehicleStatus) in STATUS_CONFIG
                  ? (v.status as VehicleStatus)
                  : "inactive";
                const cfg = STATUS_CONFIG[statusKey];
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{v.name}</div>
                      <div className="text-xs text-gray-400">{v.location}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{v.location ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{v.type}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {v.dailyRate ? `${v.dailyRate} EGP` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={v.status}
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: v.id,
                            status: e.target.value as VehicleStatus,
                          })
                        }
                        className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${cfg.badge}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_CONFIG[s].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/vehicles/${v.id}/condition`}
                        className="text-emerald-600 hover:underline text-xs"
                      >
                        Condition →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
