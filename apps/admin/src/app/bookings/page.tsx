"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";
import { TWSelect } from "../../lib/tw-select";

interface BookingRow {
  id: string;
  userId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  pickupDate?: string | null;
  returnDate?: string | null;
  status: "confirmed" | "active" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "refunded";
  totalCost: string | number;
  createdAt: string;
  user?: { id: string; name: string; phone: string };
  vehicle?: { id: string; name: string };
}

const STATUS_STYLES: Record<BookingRow["status"], string> = {
  confirmed: "bg-blue-100 text-blue-700",
  active: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PAYMENT_STYLES: Record<BookingRow["paymentStatus"], string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  refunded: "bg-gray-200 text-gray-600",
};

export default function BookingsPage(): JSX.Element {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BookingRow["status"] | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      return authedFetch<{ data: BookingRow[] }>(`/api/bookings?${params}`);
    },
  });

  const bookings = data?.data ?? [];
  const selected = selectedId ? bookings.find((b) => b.id === selectedId) ?? null : null;

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-sm text-gray-500">{bookings.length} bookings</p>
        </div>
        <TWSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as BookingRow["status"] | "")}
          options={[
            { value: "", label: "All statuses" },
            { value: "confirmed", label: "Confirmed", color: "#1338A8" },
            { value: "active", label: "Active", color: "#5300A8" },
            { value: "completed", label: "Completed", color: "#0A6B0A" },
            { value: "cancelled", label: "Cancelled", color: "#A00000" },
          ]}
        />
      </header>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Vehicle</th>
              <th className="text-left px-4 py-3">Period</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Payment</th>
              <th className="text-right px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y tw-stagger">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No bookings.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedId === b.id ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.user?.name ?? "—"}</div>
                    <div className="text-xs text-gray-400">{b.user?.phone}</div>
                  </td>
                  <td className="px-4 py-3">{b.vehicle?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(b.startDate).toLocaleDateString()} →{" "}
                    {new Date(b.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[b.status]}`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PAYMENT_STYLES[b.paymentStatus]}`}
                    >
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    EGP {Number(b.totalCost ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <BookingDrawer
          booking={selected}
          onClose={() => setSelectedId(null)}
          onChange={() => void qc.invalidateQueries({ queryKey: ["bookings"] })}
        />
      )}
    </div>
  );
}

function BookingDrawer({
  booking,
  onClose,
  onChange,
}: {
  booking: BookingRow;
  onClose: () => void;
  onChange: () => void;
}): JSX.Element {
  const cancelMutation = useMutation({
    mutationFn: () => authedFetch(`/api/bookings/${booking.id}/cancel`, { method: "POST" }),
    onSuccess: () => onChange(),
  });
  const markPaidMutation = useMutation({
    mutationFn: () => authedFetch(`/api/bookings/${booking.id}/mark-paid`, { method: "POST" }),
    onSuccess: () => onChange(),
  });
  const refundMutation = useMutation({
    mutationFn: () => authedFetch(`/api/bookings/${booking.id}/refund`, { method: "POST" }),
    onSuccess: () => onChange(),
  });

  const isCancelled = booking.status === "cancelled";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white h-full overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Booking</h2>
            <p className="text-xs text-gray-500 mt-1">#{booking.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <Row label="Customer">
            {booking.user ? (
              <Link
                href={`/customers/${booking.userId}`}
                className="text-blue-600 hover:underline"
              >
                {booking.user.name}
              </Link>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Vehicle">{booking.vehicle?.name ?? "—"}</Row>
          <Row label="Pickup">{new Date(booking.startDate).toLocaleString()}</Row>
          <Row label="Return">{new Date(booking.endDate).toLocaleString()}</Row>
          <Row label="Total">EGP {Number(booking.totalCost ?? 0).toLocaleString()}</Row>
          <Row label="Status">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[booking.status]}`}
            >
              {booking.status}
            </span>
          </Row>
          <Row label="Payment">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PAYMENT_STYLES[booking.paymentStatus]}`}
            >
              {booking.paymentStatus}
            </span>
          </Row>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Actions</div>
          {booking.paymentStatus !== "paid" && !isCancelled && (
            <button
              onClick={() => markPaidMutation.mutate()}
              disabled={markPaidMutation.isPending}
              className="w-full px-4 py-2 border border-green-500 text-green-600 hover:bg-green-50 text-sm font-medium rounded-md disabled:opacity-40"
            >
              {markPaidMutation.isPending ? "…" : "Mark as paid"}
            </button>
          )}
          {booking.paymentStatus === "paid" && (
            <button
              onClick={() => {
                if (confirm("Refund this booking? Customer will be notified.")) {
                  refundMutation.mutate();
                }
              }}
              disabled={refundMutation.isPending}
              className="w-full px-4 py-2 border border-yellow-500 text-yellow-600 hover:bg-yellow-50 text-sm font-medium rounded-md disabled:opacity-40"
            >
              {refundMutation.isPending ? "…" : "Issue refund"}
            </button>
          )}
          {!isCancelled && (
            <button
              onClick={() => {
                if (confirm("Cancel this booking? Refund will be issued if already paid.")) {
                  cancelMutation.mutate();
                }
              }}
              disabled={cancelMutation.isPending}
              className="w-full px-4 py-2 border border-red-500 text-red-600 hover:bg-red-50 text-sm font-medium rounded-md disabled:opacity-40"
            >
              {cancelMutation.isPending ? "…" : "Cancel booking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800">{children}</span>
    </div>
  );
}
