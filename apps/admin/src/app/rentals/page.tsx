"use client";

import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@trendywheels/ui-brand/empty-state";
import type { JSX } from "react";

import { authedFetch } from "../../lib/fetcher";

interface RentalListing {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  condition: string;
  dailyRateEgp?: number | null;
  notes?: string | null;
  photos: string[];
  status: string;
  declineReason?: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string | null; phone: string };
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-700",
  reviewing: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  paused: "bg-gray-100 text-gray-600",
  withdrawn: "bg-gray-100 text-gray-600",
};

function formatCategory(category: string): string {
  return category.replace(/_/g, " ");
}

export default function AdminRentalsPage(): JSX.Element {
  const q = useQuery({
    queryKey: ["admin-rental-listings"],
    queryFn: () => authedFetch<{ data: RentalListing[] }>("/api/rental-listings/admin/all"),
  });
  const items = q.data?.data ?? [];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-1">Rental listings</h1>
      <p className="text-sm text-gray-500 mb-5">Customer-submitted vehicles offered for rent.</p>

      {q.isLoading ? (
        <div className="text-gray-500 py-12 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🔑"
          title="No rental listings yet"
          description="Customers submit a vehicle from the mobile app to list it for rent. When a submission lands, you'll review the photos and details here."
        />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Submitted</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Vehicle</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Condition</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Daily rate (EGP)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.user.name}</div>
                    <div className="text-xs text-gray-500">{r.user.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    {r.brand} {r.model} ({r.year})
                  </td>
                  <td className="px-4 py-3 capitalize">{formatCategory(r.category)}</td>
                  <td className="px-4 py-3 capitalize">{r.condition}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {r.dailyRateEgp != null ? Number(r.dailyRateEgp).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
