"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@trendywheels/ui-brand/empty-state";
import { useState } from "react";
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

// Statuses an admin can still act on (approve / decline).
const ACTIONABLE = new Set(["submitted", "reviewing"]);

function formatCategory(category: string): string {
  return category.replace(/_/g, " ");
}

export default function AdminRentalsPage(): JSX.Element {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-rental-listings"],
    queryFn: () => authedFetch<{ data: RentalListing[] }>("/api/rental-listings/admin/all"),
  });
  const items = q.data?.data ?? [];
  const selected = items.find((r) => r.id === selectedId);

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
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="border-t cursor-pointer hover:bg-gray-50"
                >
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
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(r.id);
                      }}
                      className="text-xs text-blue-600 font-semibold"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <Drawer
          item={selected}
          onClose={() => setSelectedId(null)}
          onReviewed={() => {
            qc.invalidateQueries({ queryKey: ["admin-rental-listings"] });
            setSelectedId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Drawer({
  item,
  onClose,
  onReviewed,
}: {
  item: RentalListing;
  onClose: () => void;
  onReviewed: () => void;
}): JSX.Element {
  const [declineReason, setDeclineReason] = useState("");

  const submit = useMutation({
    mutationFn: (status: "approved" | "declined") =>
      authedFetch(`/api/rental-listings/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(
          status === "declined"
            ? { status, declineReason: declineReason.trim() || null }
            : { status },
        ),
      }),
    onSuccess: onReviewed,
  });

  const actionable = ACTIONABLE.has(item.status);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center sm:justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:h-full overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-1">Rental review</h2>
        <p className="text-sm text-gray-500 mb-4">
          {item.user.name} · {item.user.phone}
        </p>

        {item.photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {item.photos.map((src, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-gray-100 bg-cover bg-center"
                style={{ backgroundImage: `url(${src})` }}
              />
            ))}
          </div>
        ) : null}

        <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4 mb-4">
          <Row label="Brand">{item.brand}</Row>
          <Row label="Model">{item.model}</Row>
          <Row label="Year">{item.year}</Row>
          <Row label="Category" capitalize>
            {formatCategory(item.category)}
          </Row>
          <Row label="Condition" capitalize>
            {item.condition}
          </Row>
          <Row label="Daily rate">
            {item.dailyRateEgp != null ? `EGP ${Number(item.dailyRateEgp).toLocaleString()}` : "—"}
          </Row>
          {item.notes ? <Row label="Notes">{item.notes}</Row> : null}
        </div>

        {actionable ? (
          <>
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">
                Decline reason (sent to customer if you decline)
              </div>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                placeholder="Optional — e.g. photos unclear, vehicle not eligible…"
                className="w-full p-2.5 border rounded-lg"
              />
            </div>
            {submit.isError ? (
              <p className="mt-2 text-sm text-red-600">
                Couldn’t save — {(submit.error as Error).message || "please try again."}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                disabled={submit.isPending}
                onClick={() => submit.mutate("declined")}
                className="px-4 py-2 border rounded-lg text-red-600 font-semibold disabled:opacity-50"
              >
                {submit.isPending ? "…" : "Decline"}
              </button>
              <button
                disabled={submit.isPending}
                onClick={() => submit.mutate("approved")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {submit.isPending ? "Saving…" : "Approve"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600 italic">
            Status: <strong className="capitalize">{item.status}</strong>
            {item.declineReason ? (
              <>
                {" "}
                · Reason: <span className="not-italic">{item.declineReason}</span>
              </>
            ) : null}
          </div>
        )}

        <button onClick={onClose} className="mt-6 text-sm text-gray-500 underline">
          Close
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  capitalize,
}: {
  label: string;
  children: React.ReactNode;
  capitalize?: boolean;
}): JSX.Element {
  return (
    <div className="flex">
      <div className="w-24 text-gray-500">{label}</div>
      <div className={`flex-1 font-medium ${capitalize ? "capitalize" : ""}`}>{children}</div>
    </div>
  );
}
