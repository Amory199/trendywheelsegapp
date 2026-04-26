"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { authedFetch } from "../../../lib/fetcher";

interface CustomerNote {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
}

interface CustomerProfile {
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    accountType: string;
    loyaltyTier: string;
    loyaltyPoints: number;
    createdAt: string;
    updatedAt: string;
  };
  bookings: Array<{
    id: string;
    status: string;
    paymentStatus: string;
    totalCost: number | string;
    pickupDate: string;
    returnDate: string;
    createdAt: string;
    vehicle?: { id: string; name: string; type: string };
  }>;
  tickets: Array<{
    id: string;
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
  repairs: Array<{
    id: string;
    description: string;
    status: string;
    category: string;
    createdAt: string;
  }>;
  listings: Array<{
    id: string;
    title: string;
    price: number | string;
    status: string;
    createdAt: string;
  }>;
}

type Tab = "bookings" | "tickets" | "repairs" | "listings" | "notes";

export default function AdminCustomerDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("bookings");
  const [noteDraft, setNoteDraft] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () => authedFetch<{ data: CustomerProfile }>(`/api/admin/customers/${id}`),
    enabled: Boolean(id),
  });

  const { data: notesData } = useQuery({
    queryKey: ["admin-customer-notes", id],
    queryFn: () =>
      authedFetch<{ data: CustomerNote[] }>(`/api/admin/customers/${id}/notes`),
    enabled: Boolean(id),
  });
  const notes = notesData?.data ?? [];

  const addNote = useMutation({
    mutationFn: (body: string) =>
      authedFetch(`/api/admin/customers/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setNoteDraft("");
      void qc.invalidateQueries({ queryKey: ["admin-customer-notes", id] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: (noteId: string) =>
      authedFetch(`/api/admin/customers/${id}/notes/${noteId}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-customer-notes", id] }),
  });

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading customer…</div>;
  }

  if (!data?.data) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Customer not found.</p>
        <Link href="/customers" className="text-blue-600 hover:underline mt-2 inline-block">
          ← Back to customers
        </Link>
      </div>
    );
  }

  const { user, bookings, tickets, repairs, listings } = data.data;
  const totalSpent = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + Number(b.totalCost ?? 0), 0);

  const counts = {
    bookings: bookings.length,
    tickets: tickets.length,
    repairs: repairs.length,
    listings: listings.length,
    notes: notes.length,
  };

  return (
    <div className="p-8 max-w-6xl">
      <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 mb-4">
        ← Back
      </button>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-pink-500 text-white grid place-items-center text-xl font-bold">
              {user.name
                .split(" ")
                .map((p) => p[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <div className="text-sm text-gray-500 mt-1">{user.email ?? user.phone}</div>
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
                  {user.accountType}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 capitalize">
                  {user.loyaltyTier} · {user.loyaltyPoints} pts
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Total spent</div>
            <div className="text-2xl font-bold">EGP {totalSpent.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {(
          [
            ["bookings", "Bookings"],
            ["tickets", "Tickets"],
            ["repairs", "Repairs"],
            ["listings", "Listings"],
            ["notes", "Notes"],
          ] as Array<[Tab, string]>
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`bg-white border rounded-lg p-4 text-left transition ${
              tab === k ? "border-blue-500 ring-2 ring-blue-100" : "hover:border-gray-300"
            }`}
          >
            <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-bold mt-1">{counts[k]}</div>
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {tab === "bookings" && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Vehicle</th>
                <th className="text-left px-4 py-3">Pickup</th>
                <th className="text-left px-4 py-3">Return</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    No bookings yet.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{b.vehicle?.name ?? "—"}</div>
                      <div className="text-xs text-gray-400 capitalize">{b.vehicle?.type}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(b.pickupDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(b.returnDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
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
        )}

        {tab === "tickets" && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Subject</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Priority</th>
                <th className="text-left px-4 py-3">Opened</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    No tickets.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{t.subject}</td>
                    <td className="px-4 py-3 text-xs capitalize">{t.status}</td>
                    <td className="px-4 py-3 text-xs capitalize">{t.priority}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/tickets/${t.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === "repairs" && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {repairs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No repairs.
                  </td>
                </tr>
              ) : (
                repairs.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{r.description}</td>
                    <td className="px-4 py-3 text-xs capitalize">{r.category}</td>
                    <td className="px-4 py-3 text-xs capitalize">{r.status}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === "listings" && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Listed</th>
                <th className="text-right px-4 py-3">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No listings.
                  </td>
                </tr>
              ) : (
                listings.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{l.title}</td>
                    <td className="px-4 py-3 text-xs capitalize">{l.status}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      EGP {Number(l.price ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === "notes" && (
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-2">
                  No notes yet. Add the first one below.
                </p>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
                  >
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.body}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        {n.author.name} · {new Date(n.createdAt).toLocaleString()}
                      </p>
                      <button
                        onClick={() => {
                          if (confirm("Delete this note?")) deleteNote.mutate(n.id);
                        }}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add an internal note about this customer…"
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={() => addNote.mutate(noteDraft.trim())}
                disabled={!noteDraft.trim() || addNote.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-40"
              >
                {addNote.isPending ? "Saving…" : "Save Note"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
