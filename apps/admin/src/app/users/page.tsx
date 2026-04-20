"use client";

import type { User } from "@trendywheels/types";

import { DataTable } from "../../lib/data-table";
import { useList } from "../../lib/fetcher";

export default function UsersPage(): JSX.Element {
  const { data, isLoading } = useList<User>("/api/users", "users");
  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-gray-500">{data.length} users</p>
      </header>
      <DataTable
        rows={data}
        isLoading={isLoading}
        rowKey={(u) => u.id}
        columns={[
          { header: "Name", cell: (u) => <span className="font-medium">{u.name || "—"}</span> },
          { header: "Phone", cell: (u) => u.phone },
          { header: "Email", cell: (u) => u.email ?? "—" },
          { header: "Type", cell: (u) => u.accountType },
          { header: "Loyalty", cell: (u) => `${u.loyaltyTier} (${u.loyaltyPoints})` },
          { header: "Status", cell: (u) => u.status },
        ]}
      />
    </div>
  );
}
