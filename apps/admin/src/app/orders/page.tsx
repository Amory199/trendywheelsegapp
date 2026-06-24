"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@trendywheels/ui-brand/empty-state";
import Link from "next/link";
import { useState } from "react";
import type { JSX, ReactNode } from "react";

import { authedFetch } from "../../lib/fetcher";
import { fulfillmentLabel } from "../../lib/fulfillment";

interface OrderRow {
  id: string;
  status: string;
  totalEgp: string;
  tradeInId: string | null;
  dropoffLocationUrl: string | null;
  fulfillmentType: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    idFrontUrl?: string | null;
    idBackUrl?: string | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPriceEgp: string;
    product: { id: string; name: string; category: string };
  }>;
}

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function AdminOrdersPage(): JSX.Element {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => authedFetch<{ data: OrderRow[] }>("/api/orders/admin/all"),
  });
  const items = q.data?.data ?? [];
  const filtered = filter ? items.filter((o) => o.status === filter) : items;
  const selected = items.find((o) => o.id === selectedId) ?? null;

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      authedFetch(`/api/orders/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-1">Orders</h1>
      <p className="text-sm text-gray-500 mb-5">All product orders.</p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("")}
          className={`px-3 py-1.5 text-xs rounded-full ${
            !filter ? "bg-gray-900 text-white" : "bg-white border"
          }`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-full capitalize ${
              filter === s ? "bg-gray-900 text-white" : "bg-white border"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="text-gray-500 py-12 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        items.length === 0 && !filter ? (
          <EmptyState
            icon="🛒"
            title="No orders yet"
            description="Product orders show up here as soon as customers check out from the mobile app. Make sure your products page is stocked first."
            action={
              <Link
                href="/products"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition"
              >
                Manage products
              </Link>
            }
          />
        ) : (
          <div className="text-gray-500 py-12 text-center">
            No orders with status &quot;{filter}&quot;.
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Items</th>
                <th className="text-right px-4 py-3">Total (EGP)</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedId(o.id)}
                >
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">{o.id.slice(0, 8)}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.user.name}</div>
                    <div className="text-xs text-gray-500">{o.user.email ?? o.user.phone}</div>
                    {fulfillmentLabel(o.fulfillmentType) ? (
                      <div className="text-xs text-gray-500">
                        {fulfillmentLabel(o.fulfillmentType)}
                      </div>
                    ) : null}
                    {o.dropoffLocationUrl ? (
                      <a
                        href={o.dropoffLocationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        📍 Drop-off in Maps
                      </a>
                    ) : (
                      <div className="text-xs text-gray-400">Store pickup</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {o.items.map((i) => (
                      <div key={i.id}>
                        {i.quantity}× {i.product.name}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {Number(o.totalEgp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        STATUS_COLORS[o.status]
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={o.status}
                      onChange={(e) => setStatus.mutate({ id: o.id, status: e.target.value })}
                      className="text-xs p-1.5 border rounded-md"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? <OrderDrawer order={selected} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}

function OrderDrawer({ order, onClose }: { order: OrderRow; onClose: () => void }): JSX.Element {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex sm:justify-end" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:h-full overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold">Order</h2>
        <p className="text-sm text-gray-500 font-mono">{order.id}</p>

        <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4">
          <Row label="Customer">{order.user.name}</Row>
          <Row label="Phone">{order.user.phone}</Row>
          {order.user.email ? <Row label="Email">{order.user.email}</Row> : null}
          <Row label="Total">EGP {Number(order.totalEgp).toLocaleString()}</Row>
          <Row label="Status">
            <span className="capitalize">{order.status}</span>
          </Row>
          {fulfillmentLabel(order.fulfillmentType) ? (
            <Row label="Fulfillment">{fulfillmentLabel(order.fulfillmentType)}</Row>
          ) : null}
          <Row label="Delivery">
            {order.dropoffLocationUrl ? (
              <a
                href={order.dropoffLocationUrl}
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
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</div>
          <div className="space-y-1 text-sm">
            {order.items.map((i) => (
              <div key={i.id} className="flex justify-between">
                <span>
                  {i.quantity}× {i.product.name}
                </span>
                <span className="text-gray-500">EGP {Number(i.unitPriceEgp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {order.user.idFrontUrl || order.user.idBackUrl ? (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer ID</div>
            <div className="flex gap-3">
              {[order.user.idFrontUrl, order.user.idBackUrl].map((u, i) =>
                u ? (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="w-36">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="ID" className="w-36 h-20 object-cover rounded border" />
                  </a>
                ) : null,
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">No ID uploaded by this customer.</p>
        )}

        <button onClick={onClose} className="text-sm text-gray-500 underline">
          Close
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
