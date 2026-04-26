"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Booking, RepairRequest, SupportTicket, User } from "@trendywheels/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "../../../lib/api";
import { authedFetch } from "../../../lib/fetcher";

interface CustomerNote {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
}

const TIER_COLORS: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
};

type Tab = "tickets" | "bookings" | "repairs" | "notes";

export default function CustomerDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("tickets");
  const [note, setNote] = useState("");
  const qc = useQueryClient();

  const { data: notesData } = useQuery({
    queryKey: ["customer-notes", id],
    queryFn: () =>
      authedFetch<{ data: CustomerNote[] }>(`/api/admin/customers/${id}/notes`),
    enabled: !!id,
  });
  const notes = notesData?.data ?? [];

  const addNoteMutation = useMutation({
    mutationFn: (body: string) =>
      authedFetch(`/api/admin/customers/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setNote("");
      void qc.invalidateQueries({ queryKey: ["customer-notes", id] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) =>
      authedFetch(`/api/admin/customers/${id}/notes/${noteId}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["customer-notes", id] }),
  });

  const { data: userData, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => api.getUser(id),
    enabled: !!id,
  });

  const { data: ticketsData } = useQuery({
    queryKey: ["customer-tickets", id],
    queryFn: () => authedFetch<{ data: SupportTicket[] }>(`/api/tickets?userId=${id}&limit=20`),
    enabled: !!id,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ["customer-bookings", id],
    queryFn: () => api.getBookings({ limit: 20 }),
    enabled: !!id,
  });

  const { data: repairsData } = useQuery({
    queryKey: ["customer-repairs", id],
    queryFn: () => api.getRepairRequests({ limit: 20 }),
    enabled: !!id,
  });

  const user = userData?.data as User | undefined;
  const tickets = (ticketsData?.data ?? []) as SupportTicket[];
  const bookings = (bookingsData?.data ?? []) as Booking[];
  const repairs = (repairsData?.data ?? []) as RepairRequest[];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">Loading profile…</div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Customer not found.</p>
        <Link href="/customers" className="text-blue-600 hover:underline mt-2 block">
          ← Back to customers
        </Link>
      </div>
    );
  }

  const tierColor = TIER_COLORS[user.loyaltyTier ?? "bronze"] ?? TIER_COLORS.bronze;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 mb-4 block">
        ← Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border p-6 mb-6 flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold shrink-0">
          {(user.name ?? user.phone ?? "?")[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{user.name ?? "Unnamed"}</h1>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold border"
              style={{ color: tierColor, borderColor: tierColor + "66", backgroundColor: tierColor + "22" }}
            >
              {(user.loyaltyTier ?? "bronze").toUpperCase()}
            </span>
          </div>
          <div className="flex gap-4 mt-1 text-sm text-gray-500">
            {user.phone && <span>📱 {user.phone}</span>}
            {user.email && <span>✉️ {user.email}</span>}
            <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold" style={{ color: tierColor }}>
            {(user.loyaltyPoints ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">loyalty points</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{tickets.length}</div>
          <div className="text-xs text-gray-500 mt-1">Support Tickets</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{bookings.length}</div>
          <div className="text-xs text-gray-500 mt-1">Bookings</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{repairs.length}</div>
          <div className="text-xs text-gray-500 mt-1">Repair Requests</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-6">
        <Link
          href={`/chat`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition"
        >
          💬 Start Chat
        </Link>
        <Link
          href={`/tickets?userId=${user.id}`}
          className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-sm font-medium rounded-md transition"
        >
          🎫 View Tickets
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex border-b">
          {(["tickets", "bookings", "repairs", "notes"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition capitalize ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === "tickets" && (
            <div className="space-y-2">
              {tickets.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">No tickets</p>
              ) : (
                tickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tickets/${t.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition"
                  >
                    <span className="text-sm font-medium">{t.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        {t.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {tab === "bookings" && (
            <div className="space-y-2">
              {bookings.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">No bookings</p>
              ) : (
                bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <div className="text-sm font-medium">Booking #{b.id.slice(0, 8)}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(b.startDate).toLocaleDateString()} →{" "}
                        {new Date(b.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {b.totalCost ? `${b.totalCost.toLocaleString()} EGP` : "—"}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "repairs" && (
            <div className="space-y-2">
              {repairs.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">No repair requests</p>
              ) : (
                repairs.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <div className="text-sm font-medium capitalize">{r.category}</div>
                      <div className="text-xs text-gray-400 truncate max-w-xs">{r.description}</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                      {r.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "notes" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {notes.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-2">No notes yet</p>
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
                            if (confirm("Delete this note?")) deleteNoteMutation.mutate(n.id);
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
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add an internal note about this customer…"
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={() => addNoteMutation.mutate(note.trim())}
                  disabled={!note.trim() || addNoteMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition disabled:opacity-40"
                >
                  {addNoteMutation.isPending ? "Saving…" : "Save Note"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
