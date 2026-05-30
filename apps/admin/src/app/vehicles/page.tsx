"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ListingType, Vehicle, VehicleStatus } from "@trendywheels/types";
import { EmptyState } from "@trendywheels/ui-brand/empty-state";
import { PageHeader } from "@trendywheels/ui-brand/page-header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { JSX } from "react";

import { api } from "../../lib/api";
import { useList } from "../../lib/fetcher";
import { TourHelpButton } from "../../lib/tour-help-button";

const STATUS_STYLES: Record<VehicleStatus, string> = {
  available: "bg-green-100 text-green-700",
  rented: "bg-yellow-100 text-yellow-700",
  maintenance: "bg-orange-100 text-orange-700",
  inactive: "bg-gray-100 text-gray-600",
};

const LISTING_STYLES: Record<ListingType, string> = {
  rent: "bg-blue-100 text-blue-700",
  sale: "bg-purple-100 text-purple-700",
  both: "bg-emerald-100 text-emerald-700",
};

const LISTING_LABEL: Record<ListingType, string> = {
  rent: "Rent",
  sale: "Sale",
  both: "Rent + Sale",
};

export default function VehiclesPage(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useList<Vehicle>("/api/vehicles?limit=200", "vehicles");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<VehicleStatus>("inactive");
  const [search, setSearch] = useState("");
  const [listingFilter, setListingFilter] = useState<"all" | ListingType>("all");

  const filtered = data.filter((v) => {
    if (listingFilter !== "all" && v.listingType !== listingFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return v.name.toLowerCase().includes(q) || v.location.toLowerCase().includes(q);
    }
    return true;
  });

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
    <>
      <PageHeader
        title="Inventory"
        subtitle={`${data.length} cart${data.length === 1 ? "" : "s"} · pick rent / sale / both per cart`}
        helpButton={<TourHelpButton pageKey="admin:vehicles" />}
        rightSlot={
          <Link
            href="/vehicles/create"
            data-tour="vehicles-add-button"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition"
          >
            + Add cart
          </Link>
        }
      />
      <div className="p-8 space-y-6">
        <div className="flex gap-3 flex-wrap items-center">
          <input
            type="text"
            placeholder="Search by name or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 max-w-md border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex gap-1 bg-gray-100 rounded-md p-1">
            {(["all", "rent", "sale", "both"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setListingFilter(f)}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  listingFilter === f
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {f === "all"
                  ? "All"
                  : f === "both"
                    ? "Rent + Sale"
                    : f === "rent"
                      ? "Rent only"
                      : "Sale only"}
              </button>
            ))}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-lg px-4 py-3">
            <span className="text-sm font-medium text-primary-600">{selected.size} selected</span>
            <div className="flex items-center gap-2 ml-auto">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as VehicleStatus)}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none"
              >
                {(["available", "rented", "maintenance", "inactive"] as VehicleStatus[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ),
                )}
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
              <button
                onClick={() => setSelected(new Set())}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {!isLoading && data.length === 0 ? (
          <EmptyState
            icon="🚗"
            title="No carts in your inventory yet"
            description="Add your first cart — once it's published, it's instantly bookable in the customer app for rent, sale, or both."
            action={
              <Link
                href="/vehicles/create"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition"
              >
                + Add your first cart
              </Link>
            }
          />
        ) : (
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
                  <th className="text-left px-4 py-3">Listing</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Seats</th>
                  <th className="text-left px-4 py-3">Pricing</th>
                  <th className="text-left px-4 py-3">Location</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No carts match the current filter or search. Try clearing them.
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => {
                    const listing = (v.listingType ?? "rent") as ListingType;
                    return (
                      <tr
                        key={v.id}
                        onClick={() => router.push(`/vehicles/${v.id}`)}
                        className={`cursor-pointer hover:bg-gray-50 ${selected.has(v.id) ? "bg-primary-50" : ""}`}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(v.id)}
                            onChange={() => toggle(v.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{v.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${LISTING_STYLES[listing]}`}
                          >
                            {LISTING_LABEL[listing]}
                          </span>
                        </td>
                        <td className="px-4 py-3">{v.type}</td>
                        <td className="px-4 py-3">{v.seating}</td>
                        <td className="px-4 py-3 text-xs">
                          {listing !== "sale" && (
                            <div>{Number(v.dailyRate).toLocaleString()} EGP/day</div>
                          )}
                          {listing !== "rent" && v.salePrice != null && (
                            <div className="text-purple-700">
                              {Number(v.salePrice).toLocaleString()} EGP sale
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">{v.location}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[v.status]}`}
                          >
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
