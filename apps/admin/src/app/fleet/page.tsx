"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

type VehicleStatus = "available" | "rented" | "maintenance" | "inactive";

interface Vehicle {
  id: string;
  name: string;
  type: string;
  seating: number;
  dailyRate: string | number;
  location: string;
  status: VehicleStatus;
  images?: string[];
}

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
const TYPES = ["All", "4-seater", "6-seater", "LED"];

export default function AdminFleetPage(): JSX.Element {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data, isLoading } = useQuery({
    queryKey: ["fleet", statusFilter, typeFilter],
    queryFn: () => {
      const p = new URLSearchParams({ limit: "200" });
      if (statusFilter !== "all") p.set("status", statusFilter);
      if (typeFilter !== "All") p.set("type", typeFilter);
      return authedFetch<{ data: Vehicle[] }>(`/api/vehicles?${p}`);
    },
    refetchInterval: 30_000,
  });

  const vehicles = data?.data ?? [];
  const filtered = search
    ? vehicles.filter(
        (v) =>
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          v.location.toLowerCase().includes(search.toLowerCase()),
      )
    : vehicles;

  const counts = STATUSES.reduce<Record<string, number>>(
    (acc, s) => ({ ...acc, [s]: vehicles.filter((v) => v.status === s).length }),
    {},
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VehicleStatus }) =>
      authedFetch(`/api/vehicles/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fleet"] }),
  });

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleet availability</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {vehicles.length} vehicles · live status across the fleet
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-md text-sm border ${viewMode === "grid" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-50"}`}
          >
            ⊞ Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-md text-sm border ${viewMode === "list" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-50"}`}
          >
            ☰ List
          </button>
          <Link
            href="/vehicles/create"
            className="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            + New vehicle
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-4">
        {STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={`bg-white rounded-xl border p-4 text-left transition hover:shadow-sm ${
                statusFilter === s
                  ? cfg.border + " ring-2 ring-offset-1 ring-blue-400"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                <span className="text-xs font-medium text-gray-500">{cfg.label}</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{counts[s] ?? 0}</div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Search name or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
          No vehicles found
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((v) => {
            const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.inactive;
            return (
              <div key={v.id} className={`bg-white rounded-xl border p-4 space-y-3 ${cfg.border}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/vehicles/${v.id}`}
                      className="font-semibold text-gray-900 hover:underline"
                    >
                      {v.name}
                    </Link>
                    <div className="text-xs text-gray-400">{v.location}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div>
                    {v.type} · {v.seating} seats
                  </div>
                  <div>EGP {Number(v.dailyRate).toLocaleString()} / day</div>
                </div>
                <select
                  value={v.status}
                  onChange={(e) =>
                    updateMutation.mutate({ id: v.id, status: e.target.value as VehicleStatus })
                  }
                  className="w-full text-xs border border-gray-200 rounded-md px-2 py-1"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Location</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Rate</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((v) => {
                const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.inactive;
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/vehicles/${v.id}`} className="font-medium hover:underline">
                        {v.name}
                      </Link>
                      <div className="text-xs text-gray-400">{v.seating} seats</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{v.type}</td>
                    <td className="px-4 py-3 text-gray-600">{v.location}</td>
                    <td className="px-4 py-3 text-gray-600">
                      EGP {Number(v.dailyRate).toLocaleString()}
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
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/vehicles/${v.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Details →
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
