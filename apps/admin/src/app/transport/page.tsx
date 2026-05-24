"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { JSX } from "react";

import { authedFetch } from "../../lib/fetcher";

interface Transport {
  id: string;
  fromAddress: string;
  toAddress: string;
  pickupAt: string;
  cargoNotes?: string | null;
  status: string;
  priceEgp?: string | null;
  driverId?: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string | null; phone: string };
}

const STATUSES = ["submitted", "scheduled", "in_transit", "completed", "cancelled"] as const;
const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-700",
  scheduled: "bg-blue-100 text-blue-700",
  in_transit: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function AdminTransportPage(): JSX.Element {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-transport"],
    queryFn: () => authedFetch<{ data: Transport[] }>("/api/transport/admin/all"),
  });
  const items = q.data?.data ?? [];
  const selected = items.find((t) => t.id === selectedId);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-1">Transportation</h1>
      <p className="text-sm text-gray-500 mb-5">Customer trip requests.</p>

      {q.isLoading ? (
        <div className="text-gray-500 py-12 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-500 py-12 text-center">No requests yet.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Pickup</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Route</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Price (EGP)</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {new Date(t.pickupAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.user.name}</div>
                    <div className="text-xs text-gray-500">{t.user.email ?? t.user.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>{t.fromAddress}</div>
                    <div className="text-gray-400">→ {t.toAddress}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[t.status]}`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {t.priceEgp ? Number(t.priceEgp).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedId(t.id)}
                      className="text-xs text-blue-600 font-semibold"
                    >
                      Manage
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
          onUpdated={() => {
            qc.invalidateQueries({ queryKey: ["admin-transport"] });
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
  onUpdated,
}: {
  item: Transport;
  onClose: () => void;
  onUpdated: () => void;
}): JSX.Element {
  const [price, setPrice] = useState(item.priceEgp ?? "");
  const [status, setStatus] = useState(item.status);

  const submit = useMutation({
    mutationFn: () =>
      authedFetch(`/api/transport/${item.id}/schedule`, {
        method: "POST",
        body: JSON.stringify({
          priceEgp: Number(price),
          status,
        }),
      }),
    onSuccess: onUpdated,
  });

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center sm:justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:h-full overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-1">Trip details</h2>
        <p className="text-sm text-gray-500 mb-4">{item.user.name}</p>

        <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4 mb-4">
          <Row label="From">{item.fromAddress}</Row>
          <Row label="To">{item.toAddress}</Row>
          <Row label="Pickup">{new Date(item.pickupAt).toLocaleString()}</Row>
          {item.cargoNotes ? <Row label="Notes">{item.cargoNotes}</Row> : null}
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1">Price (EGP)</div>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-2.5 border rounded-lg"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1">Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2.5 border rounded-lg"
            >
              {STATUSES.filter((s) => s !== "submitted").map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button
            disabled={!price || submit.isPending}
            onClick={() => submit.mutate()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {submit.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex">
      <div className="w-20 text-gray-500">{label}</div>
      <div className="flex-1 font-medium">{children}</div>
    </div>
  );
}
