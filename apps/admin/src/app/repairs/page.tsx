"use client";

import { DataTable } from "../../lib/data-table";
import { useList } from "../../lib/fetcher";

interface RepairRow {
  id: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  createdAt: string;
  user?: { name: string };
}

export default function RepairsPage(): JSX.Element {
  const { data, isLoading } = useList<RepairRow>("/api/repairs", "repairs");
  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Repair requests</h1>
        <p className="text-sm text-gray-500">{data.length} requests</p>
      </header>
      <DataTable
        rows={data}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        columns={[
          { header: "Customer", cell: (r) => r.user?.name ?? "—" },
          { header: "Category", cell: (r) => r.category },
          {
            header: "Priority",
            cell: (r) => (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  r.priority === "urgent" || r.priority === "high"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {r.priority}
              </span>
            ),
          },
          { header: "Status", cell: (r) => r.status.replace("_", " ") },
          {
            header: "Description",
            cell: (r) => (
              <span className="line-clamp-1 text-gray-600">{r.description}</span>
            ),
          },
          { header: "Created", cell: (r) => new Date(r.createdAt).toLocaleDateString() },
        ]}
      />
    </div>
  );
}
