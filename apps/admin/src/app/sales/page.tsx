"use client";

import { DataTable } from "../../lib/data-table";
import { useList } from "../../lib/fetcher";

interface SaleRow {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: string;
  status: string;
  views: number;
  createdAt: string;
}

export default function SalesPage(): JSX.Element {
  const { data, isLoading } = useList<SaleRow>("/api/sales", "sales");
  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Sales listings</h1>
        <p className="text-sm text-gray-500">{data.length} listings</p>
      </header>
      <DataTable
        rows={data}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        columns={[
          { header: "Title", cell: (r) => <span className="font-medium">{r.title}</span> },
          { header: "Vehicle", cell: (r) => `${r.brand} ${r.model} (${r.year})` },
          { header: "Price", cell: (r) => `${Number(r.price).toLocaleString()} EGP` },
          { header: "Views", cell: (r) => r.views },
          { header: "Status", cell: (r) => r.status },
          { header: "Listed", cell: (r) => new Date(r.createdAt).toLocaleDateString() },
        ]}
      />
    </div>
  );
}
