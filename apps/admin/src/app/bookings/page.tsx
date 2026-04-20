"use client";

import { DataTable } from "../../lib/data-table";
import { useList } from "../../lib/fetcher";

interface BookingRow {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
  totalCost: string;
  user?: { name: string; phone: string };
  vehicle?: { name: string };
}

export default function BookingsPage(): JSX.Element {
  const { data, isLoading } = useList<BookingRow>("/api/bookings?include=user,vehicle", "bookings");
  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-sm text-gray-500">{data.length} bookings</p>
      </header>
      <DataTable
        rows={data}
        isLoading={isLoading}
        rowKey={(b) => b.id}
        columns={[
          {
            header: "Customer",
            cell: (b) => b.user?.name ?? "—",
          },
          { header: "Vehicle", cell: (b) => b.vehicle?.name ?? "—" },
          {
            header: "Period",
            cell: (b) =>
              `${new Date(b.startDate).toLocaleDateString()} → ${new Date(
                b.endDate,
              ).toLocaleDateString()}`,
          },
          { header: "Total", cell: (b) => `${Number(b.totalCost).toLocaleString()} EGP` },
          {
            header: "Status",
            cell: (b) => (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                {b.status}
              </span>
            ),
          },
          {
            header: "Payment",
            cell: (b) => (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  b.paymentStatus === "paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {b.paymentStatus}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
