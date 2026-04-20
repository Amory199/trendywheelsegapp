"use client";

import type { Vehicle } from "@trendywheels/types";

import { DataTable } from "../../lib/data-table";
import { useList } from "../../lib/fetcher";

export default function VehiclesPage(): JSX.Element {
  const { data, isLoading } = useList<Vehicle>("/api/vehicles", "vehicles");
  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Vehicles</h1>
        <p className="text-sm text-gray-500">{data.length} vehicles in fleet</p>
      </header>
      <DataTable
        rows={data}
        isLoading={isLoading}
        rowKey={(v) => v.id}
        columns={[
          { header: "Name", cell: (v) => <span className="font-medium">{v.name}</span> },
          { header: "Type", cell: (v) => v.type },
          { header: "Seats", cell: (v) => v.seating },
          { header: "Fuel", cell: (v) => v.fuelType },
          { header: "Daily rate", cell: (v) => `${Number(v.dailyRate).toLocaleString()} EGP` },
          { header: "Location", cell: (v) => v.location },
          {
            header: "Status",
            cell: (v) => (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  v.status === "available"
                    ? "bg-green-100 text-green-700"
                    : v.status === "rented"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {v.status}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
