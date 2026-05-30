"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@trendywheels/ui-brand/empty-state";
import { useState } from "react";
import type { JSX } from "react";

import { authedFetch } from "../../lib/fetcher";

interface TradeIn {
  id: string;
  brand: string;
  model: string;
  year: number;
  condition: string;
  notes?: string | null;
  photos: string[];
  status: string;
  quoteEgp?: string | null;
  quoteValidUntil?: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string | null; phone: string };
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-700",
  quoted: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-600",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminTradeInsPage(): JSX.Element {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-trade-ins"],
    queryFn: () => authedFetch<{ data: TradeIn[] }>("/api/trade-in/admin/all"),
  });
  const items = q.data?.data ?? [];
  const selected = items.find((t) => t.id === selectedId);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-1">Trade-ins</h1>
      <p className="text-sm text-gray-500 mb-5">Customer-submitted carts awaiting quote.</p>

      {q.isLoading ? (
        <div className="text-gray-500 py-12 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🔁"
          title="No trade-in submissions yet"
          description="Customers submit their old cart from the mobile app for an instant quote. When a submission lands, you'll review the photos and send a quote from here."
        />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Submitted</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Cart</th>
                <th className="text-left px-4 py-3">Condition</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Quote (EGP)</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.user.name}</div>
                    <div className="text-xs text-gray-500">{t.user.email ?? t.user.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    {t.brand} {t.model} ({t.year})
                  </td>
                  <td className="px-4 py-3 capitalize">{t.condition}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        STATUS_COLORS[t.status]
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {t.quoteEgp ? Number(t.quoteEgp).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedId(t.id)}
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
          onQuoted={() => {
            qc.invalidateQueries({ queryKey: ["admin-trade-ins"] });
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
  onQuoted,
}: {
  item: TradeIn;
  onClose: () => void;
  onQuoted: () => void;
}): JSX.Element {
  const [quote, setQuote] = useState(item.quoteEgp ?? "");
  const [days, setDays] = useState("7");

  const submit = useMutation({
    mutationFn: (status: "quoted" | "rejected") =>
      authedFetch(`/api/trade-in/${item.id}/quote`, {
        method: "POST",
        body: JSON.stringify({
          quoteEgp: status === "quoted" ? Number(quote) : 0,
          validForDays: Number(days),
          status,
        }),
      }),
    onSuccess: onQuoted,
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
        <h2 className="text-2xl font-bold mb-1">Trade-in review</h2>
        <p className="text-sm text-gray-500 mb-4">{item.user.name}</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {item.photos.map((src, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-gray-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${src})` }}
            />
          ))}
        </div>

        <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4 mb-4">
          <Row label="Brand">{item.brand}</Row>
          <Row label="Model">{item.model}</Row>
          <Row label="Year">{item.year}</Row>
          <Row label="Condition" capitalize>
            {item.condition}
          </Row>
          {item.notes ? <Row label="Notes">{item.notes}</Row> : null}
        </div>

        {item.status === "submitted" ? (
          <>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Quote (EGP)</div>
                <input
                  type="number"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  className="w-full p-2.5 border rounded-lg"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Valid for (days)</div>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-full p-2.5 border rounded-lg"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => submit.mutate("rejected")}
                className="px-4 py-2 border rounded-lg text-red-600 font-semibold"
              >
                Reject
              </button>
              <button
                disabled={!quote || submit.isPending}
                onClick={() => submit.mutate("quoted")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {submit.isPending ? "Sending…" : "Send quote"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600 italic">
            Status: <strong className="capitalize">{item.status}</strong>
            {item.quoteEgp ? <> · Quoted EGP {Number(item.quoteEgp).toLocaleString()}</> : null}
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
