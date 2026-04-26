"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupportTicket, TicketPriority, TicketStatus } from "@trendywheels/types";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../lib/api";

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  "in-progress": "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const ALL_STATUSES: TicketStatus[] = ["open", "in-progress", "resolved", "closed"];
const ALL_PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

export default function TicketsPage(): JSX.Element {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "">("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", statusFilter, priorityFilter],
    queryFn: () =>
      api.getTickets({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        limit: 100,
      }),
  });

  const tickets = (data?.data ?? []) as SupportTicket[];
  const filtered = search
    ? tickets.filter((t) => t.subject.toLowerCase().includes(search.toLowerCase()))
    : tickets;

  const selected = selectedId ? filtered.find((t) => t.id === selectedId) ?? null : null;

  const updateMutation = useMutation({
    mutationFn: ({ id, update }: { id: string; update: Partial<SupportTicket> }) =>
      api.updateTicket(id, update),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["tickets"] }),
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main list */}
      <div className={`flex flex-col ${selected ? "w-1/2" : "w-full"} transition-all`}>
        <div className="p-6 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Tickets</h1>
            <span className="text-sm text-gray-500">{filtered.length} results</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search tickets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "")}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | "")}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All priorities</option>
              {ALL_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <span className="text-4xl">🎫</span>
              <span>No tickets found</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelectedId(ticket.id === selectedId ? null : ticket.id)}
                    className={`cursor-pointer transition hover:bg-gray-50 ${
                      selectedId === ticket.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-xs">
                        {ticket.subject}
                      </div>
                      <div className="text-xs text-gray-400">#{ticket.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status]}`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[ticket.priority]}`}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="text-blue-600 hover:underline text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="w-1/2 border-l bg-white flex flex-col overflow-hidden">
          <div className="p-6 border-b flex items-start justify-between">
            <div>
              <h2 className="font-bold text-lg">{selected.subject}</h2>
              <p className="text-xs text-gray-400 mt-1">#{selected.id.slice(0, 8)}</p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-auto flex-1">
            {/* Status + Priority controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                <select
                  value={selected.status}
                  onChange={(e) =>
                    updateMutation.mutate({
                      id: selected.id,
                      update: { status: e.target.value as TicketStatus },
                    })
                  }
                  className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Priority</label>
                <select
                  value={selected.priority}
                  onChange={(e) =>
                    updateMutation.mutate({
                      id: selected.id,
                      update: { priority: e.target.value as TicketPriority },
                    })
                  }
                  className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ALL_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer ID</span>
                <Link
                  href={`/customers/${selected.userId}`}
                  className="text-blue-600 hover:underline font-mono text-xs"
                >
                  {selected.userId.slice(0, 12)}…
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Assigned to</span>
                <span className="text-gray-700">
                  {selected.assignedAgentId ? selected.assignedAgentId.slice(0, 12) + "…" : "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-700">
                  {new Date(selected.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-700">
                  {new Date(selected.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Link
                href={`/tickets/${selected.id}`}
                className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-md transition"
              >
                Open Full Thread
              </Link>
              <button
                onClick={() =>
                  updateMutation.mutate({ id: selected.id, update: { status: "resolved" } })
                }
                disabled={selected.status === "resolved" || updateMutation.isPending}
                className="px-4 py-2 border border-green-600 text-green-600 hover:bg-green-50 text-sm font-medium rounded-md transition disabled:opacity-40"
              >
                Resolve
              </button>
              <button
                onClick={() =>
                  updateMutation.mutate({ id: selected.id, update: { status: "closed" } })
                }
                disabled={selected.status === "closed" || updateMutation.isPending}
                className="px-4 py-2 border border-gray-400 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-md transition disabled:opacity-40"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
