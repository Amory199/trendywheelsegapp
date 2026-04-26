"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Vehicle, VehicleStatus } from "@trendywheels/types";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../lib/api";
import { useList } from "../../lib/fetcher";

const STATUS_STYLES: Record<VehicleStatus, string> = {
  available: "bg-green-100 text-green-700",
  rented: "bg-yellow-100 text-yellow-700",
  maintenance: "bg-orange-100 text-orange-700",
  inactive: "bg-gray-100 text-gray-600",
};

export default function VehiclesPage(): JSX.Element {
  const qc = useQueryClient();
  const { data, isLoading } = useList<Vehicle>("/api/vehicles?limit=200", "vehicles");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<VehicleStatus>("inactive");
  const [search, setSearch] = useState("");

  const filtered = search
    ? data.filter(
        (v) =>
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          v.location.toLowerCase().includes(search.toLowerCase()),
      )
    : data;

  const toggleAll = (): void => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((v) => v.id)));
  };

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        Array.from(selected).map((id) => api.updateVehicle(id, { status: bulkStatus })),
      );
    },
    onSuccess: () => {
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(Array.from(selected).map((id) => api.deleteVehicle(id)));
    },
    onSuccess: () => {
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vehicles</h1>
          <p className="text-sm text-gray-500">{data.length} vehicles in fleet</p>
        </div>
        <Link
          href="/vehicles/create"
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition"
        >
          + Add Vehicle
        </Link>
      </header>

      <input
        type="text"
        placeholder="Search by name or location…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-primary-600">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as VehicleStatus)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none"
            >
              {(["available", "rented", "maintenance", "inactive"] as VehicleStatus[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() => bulkUpdateMutation.mutate()}
              disabled={bulkUpdateMutation.isPending}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-md transition disabled:opacity-50"
            >
              {bulkUpdateMutation.isPending ? "Updating…" : "Set status"}
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete ${selected.size} vehicles? This cannot be undone.`)) {
                  bulkDeleteMutation.mutate();
                }
              }}
              disabled={bulkDeleteMutation.isPending}
              className="px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm rounded-md transition disabled:opacity-50"
            >
              {bulkDeleteMutation.isPending ? "Deleting…" : "Delete"}
            </button>
            <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
              ×
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="cursor-pointer"
                />
              </th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Seats</th>
              <th className="text-left px-4 py-3">Daily rate</th>
              <th className="text-left px-4 py-3">Location</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No vehicles found.</td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id} className={`hover:bg-gray-50 ${selected.has(v.id) ? "bg-primary-50" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} className="cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3">{v.type}</td>
                  <td className="px-4 py-3">{v.seating}</td>
                  <td className="px-4 py-3">{Number(v.dailyRate).toLocaleString()} EGP</td>
                  <td className="px-4 py-3">{v.location}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[v.status]}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/vehicles/${v.id}`} className="text-primary-500 hover:underline text-xs">
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
