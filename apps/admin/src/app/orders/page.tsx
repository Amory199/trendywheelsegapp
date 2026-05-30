"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@trendywheels/ui-brand/empty-state";
import Link from "next/link";
import { useState } from "react";
import type { JSX } from "react";

import { authedFetch } from "../../lib/fetcher";

interface OrderRow {
  id: string;
  status: string;
  totalEgp: string;
  tradeInId: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string | null; phone: string };
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

  const q = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => authedFetch<{ data: OrderRow[] }>("/api/orders/admin/all"),
  });
  const items = q.data?.data ?? [];
  const filtered = filter ? items.filter((o) => o.status === filter) : items;

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
                <tr key={o.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">{o.id.slice(0, 8)}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.user.name}</div>
                    <div className="text-xs text-gray-500">{o.user.email ?? o.user.phone}</div>
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
                  <td className="px-4 py-3 text-right">
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
    </div>
  );
}
