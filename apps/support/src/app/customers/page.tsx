"use client";

import { useQuery } from "@tanstack/react-query";
import type { User } from "@trendywheels/types";
import Link from "next/link";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

const TIER_STYLES: Record<string, string> = {
  bronze: "bg-orange-100 text-orange-700",
  silver: "bg-gray-100 text-gray-600",
  gold: "bg-yellow-100 text-yellow-700",
  platinum: "bg-blue-100 text-blue-700",
};

export default function CustomersPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["users", page],
    queryFn: () => authedFetch<{ data: User[]; total: number }>(`/api/users?page=${page}&limit=20`),
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const filtered = search
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.phone?.includes(search) ||
          u.email?.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, phone, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
          <span className="text-4xl">👥</span>
          <span>No customers found</span>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tier</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Points</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Joined</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                          {(u.name ?? u.phone ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{u.name ?? "—"}</div>
                          <div className="text-xs text-gray-400">{u.email ?? ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          TIER_STYLES[u.loyaltyTier ?? "bronze"] ?? TIER_STYLES.bronze
                        }`}
                      >
                        {u.loyaltyTier ?? "bronze"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(u.loyaltyPoints ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/customers/${u.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
