"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@trendywheels/ui-brand/empty-state";
import { useState } from "react";
import type { JSX } from "react";

import { authedFetch } from "../../lib/fetcher";

interface Reservation {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  amountEgp: string | number;
  notes: string | null;
  dropoffLocationUrl: string | null;
  idFrontUrl: string | null;
  idBackUrl: string | null;
  createdAt: string;
  vehicle?: { id: string; name: string };
  user?: { id: string; name: string; email: string | null; phone: string };
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminReservationsPage(): JSX.Element {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: () => authedFetch<{ data: Reservation[] }>("/api/reservations"),
  });
  const items = q.data?.data ?? [];
  const selected = items.find((r) => r.id === selectedId);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-1">Reservations</h1>
      <p className="text-sm text-gray-500 mb-5">Customers reserving a vehicle to buy.</p>

      {q.isLoading ? (
        <div className="text-gray-500 py-12 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🔖"
          title="No reservations yet"
          description="When a customer reserves a for-sale vehicle from the app, it shows up here for your team to follow up and close."
        />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Reserved</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Vehicle</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Amount (EGP)</th>
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
                    <div className="font-medium">{r.user?.name ?? "—"}</div>
                    <div className="text-xs text-gray-500">{r.user?.phone}</div>
                  </td>
                  <td className="px-4 py-3">{r.vehicle?.name ?? "—"}</td>
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
                    {Number(r.amountEgp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(r.id);
                      }}
                      className="text-xs text-blue-600 font-semibold"
                    >
                      Open
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
          onChange={() => qc.invalidateQueries({ queryKey: ["admin-reservations"] })}
        />
      ) : null}
    </div>
  );
}

function Drawer({
  item,
  onClose,
  onChange,
}: {
  item: Reservation;
  onClose: () => void;
  onChange: () => void;
}): JSX.Element {
  const setStatus = useMutation({
    mutationFn: (status: string) =>
      authedFetch(`/api/reservations/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: onChange,
  });
  const invoice = useMutation({
    mutationFn: () =>
      authedFetch<{ data: { pdfUrl: string } }>(`/api/invoices`, {
        method: "POST",
        body: JSON.stringify({ sourceType: "reservation", sourceId: item.id, paidBy: "cash" }),
      }),
    onSuccess: (res) => {
      if (res.data?.pdfUrl) window.open(res.data.pdfUrl, "_blank");
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex sm:justify-end" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:h-full overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold">Reservation</h2>
        <p className="text-sm text-gray-500">
          {item.user?.name} · {item.user?.phone}
        </p>

        <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4">
          <Row label="Vehicle">{item.vehicle?.name ?? "—"}</Row>
          <Row label="Amount">EGP {Number(item.amountEgp).toLocaleString()}</Row>
          <Row label="Status">
            <span className="capitalize">{item.status}</span>
          </Row>
          <Row label="Delivery">
            {item.dropoffLocationUrl ? (
              <a
                href={item.dropoffLocationUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                📍 Open drop-off in Maps
              </a>
            ) : (
              <span className="text-gray-400">Store pickup</span>
            )}
          </Row>
          {item.notes ? <Row label="Notes">{item.notes}</Row> : null}
        </div>

        {item.idFrontUrl || item.idBackUrl ? (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer ID</div>
            <div className="flex gap-3">
              {[item.idFrontUrl, item.idBackUrl].map((u, i) =>
                u ? (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="w-36">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="ID" className="w-36 h-20 object-cover rounded border" />
                  </a>
                ) : null,
              )}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          {(["confirmed", "completed", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus.mutate(s)}
              disabled={setStatus.isPending || item.status === s}
              className="flex-1 px-3 py-2 border rounded-md text-xs font-semibold capitalize disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>

        <button
          onClick={() => invoice.mutate()}
          disabled={invoice.isPending}
          className="w-full px-4 py-2 bg-[#2B0FF8] text-white hover:opacity-90 text-sm font-semibold rounded-md disabled:opacity-40"
        >
          {invoice.isPending ? "Generating…" : "Generate invoice (PDF)"}
        </button>

        <button onClick={onClose} className="text-sm text-gray-500 underline">
          Close
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex">
      <div className="w-24 text-gray-500">{label}</div>
      <div className="flex-1 font-medium">{children}</div>
    </div>
  );
}
