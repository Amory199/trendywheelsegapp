"use client";

import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@trendywheels/ui-brand/empty-state";
import { PageHeader } from "@trendywheels/ui-brand/page-header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { JSX } from "react";

import { useDebounce } from "../../hooks/useDebounce";
import { authedFetch } from "../../lib/fetcher";
import { TourHelpButton } from "../../lib/tour-help-button";

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  loyaltyTier: string;
  loyaltyPoints: number;
  createdAt: string;
  _count: {
    bookings: number;
    supportTickets: number;
    repairRequests: number;
    salesListings: number;
  };
}

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-700",
  silver: "bg-slate-100 text-slate-700",
  gold: "bg-yellow-100 text-yellow-700",
  platinum: "bg-purple-100 text-purple-700",
};

export default function CustomersPage(): JSX.Element {
  const router = useRouter();
  const [q, setQ] = useState("");
  const dq = useDebounce(q);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers", dq],
    queryFn: () =>
      authedFetch<{ data: CustomerRow[]; total: number }>(
        `/api/admin/customers?limit=50${dq ? `&q=${encodeURIComponent(dq)}` : ""}`,
      ),
  });

  const rows = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${data?.total ?? 0} customers — every rental, sale, repair, and ticket per profile.`}
        helpButton={<TourHelpButton pageKey="admin:customers" />}
        rightSlot={
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone…"
            data-tour="customers-search"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        }
      />
      <div className="p-8 space-y-6">
        {!isLoading && rows.length === 0 && !dq ? (
          <EmptyState
            icon="👥"
            title="No customers yet"
            description="Customers appear here automatically after they sign up via the mobile app or the customer website. Share your store link to bring them in."
            action={
              <Link
                href="/business"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition"
              >
                Share signup link
              </Link>
            }
          />
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Contact</th>
                  <th className="text-left px-4 py-3">Loyalty</th>
                  <th className="text-left px-4 py-3">Bookings</th>
                  <th className="text-left px-4 py-3">Tickets</th>
                  <th className="text-left px-4 py-3">Repairs</th>
                  <th className="text-left px-4 py-3">Listings</th>
                  <th className="text-left px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y tw-stagger">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No customers match &quot;{dq}&quot;.
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/customers/${c.id}`)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700">{c.phone}</div>
                        <div className="text-xs text-gray-400">{c.email ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            TIER_COLORS[c.loyaltyTier] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {c.loyaltyTier}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">{c.loyaltyPoints} pts</span>
                      </td>
                      <td className="px-4 py-3">{c._count.bookings}</td>
                      <td className="px-4 py-3">{c._count.supportTickets}</td>
                      <td className="px-4 py-3">{c._count.repairRequests}</td>
                      <td className="px-4 py-3">{c._count.salesListings}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
