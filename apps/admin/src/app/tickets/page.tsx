"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupportTicket, TicketPriority, TicketStatus } from "@trendywheels/types";
import Link from "next/link";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";
import { TWSelect } from "../../lib/tw-select";

interface TicketWithUser extends SupportTicket {
  user?: { id: string; name: string; email: string | null };
  agent?: { id: string; name: string } | null;
}

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

const STATUS_DOT: Record<TicketStatus, string> = {
  open: "#1338A8",
  "in-progress": "#806000",
  resolved: "#0A6B0A",
  closed: "#888899",
};

const PRIORITY_DOT: Record<TicketPriority, string> = {
  low: "#888899",
  medium: "#1338A8",
  high: "#C25700",
  urgent: "#FF0000",
};

const STATUS_BG: Record<TicketStatus, string> = {
  open: "#E6F0FF",
  "in-progress": "#FFF4D6",
  resolved: "#E6F8E6",
  closed: "#F0F0F8",
};

const PRIORITY_BG: Record<TicketPriority, string> = {
  low: "#F0F0F8",
  medium: "#E6F0FF",
  high: "#FFEDDA",
  urgent: "#FFE0E0",
};

const ALL_STATUSES: TicketStatus[] = ["open", "in-progress", "resolved", "closed"];
const ALL_PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

export default function AdminTicketsPage(): JSX.Element {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "">("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", statusFilter, priorityFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      return authedFetch<{ data: TicketWithUser[] }>(`/api/tickets?${params}`);
    },
  });

  const tickets = data?.data ?? [];
  const filtered = search
    ? tickets.filter(
        (t) =>
          t.subject.toLowerCase().includes(search.toLowerCase()) ||
          t.user?.name.toLowerCase().includes(search.toLowerCase()),
      )
    : tickets;

  const updateMutation = useMutation({
    mutationFn: ({ id, update }: { id: string; update: Partial<SupportTicket> }) =>
      authedFetch(`/api/tickets/${id}`, {
        method: "PUT",
        body: JSON.stringify(update),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-tickets"] }),
  });

  const stats = {
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in-progress").length,
    urgent: tickets.filter((t) => t.priority === "urgent").length,
  };

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <p className="text-sm text-gray-500">{filtered.length} tickets — full platform oversight.</p>
      </header>

      <div className="grid grid-cols-3 gap-4 tw-stagger">
        <div className="bg-white border rounded-lg p-4 tw-lift">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Open</div>
          <div className="text-2xl font-bold mt-1 tw-ticker" key={`open-${stats.open}`}>{stats.open}</div>
        </div>
        <div className="bg-white border rounded-lg p-4 tw-lift">
          <div className="text-xs text-gray-500 uppercase tracking-wider">In Progress</div>
          <div className="text-2xl font-bold mt-1 tw-ticker" key={`prog-${stats.inProgress}`}>{stats.inProgress}</div>
        </div>
        <div className="bg-white border rounded-lg p-4 tw-lift">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Urgent</div>
          <div className="text-2xl font-bold mt-1 text-red-600 tw-ticker" key={`urg-${stats.urgent}`}>{stats.urgent}</div>
        </div>
      </div>

      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b flex gap-3 flex-wrap">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject or customer…"
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <TWSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as TicketStatus | "")}
            options={[
              { value: "", label: "All statuses" },
              ...ALL_STATUSES.map((s) => ({ value: s, label: s, color: STATUS_DOT[s] })),
            ]}
          />
          <TWSelect
            value={priorityFilter}
            onChange={(v) => setPriorityFilter(v as TicketPriority | "")}
            options={[
              { value: "", label: "All priorities" },
              ...ALL_PRIORITIES.map((p) => ({ value: p, label: p, color: PRIORITY_DOT[p] })),
            ]}
          />
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Subject</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Priority</th>
              <th className="text-left px-4 py-3">Agent</th>
              <th className="text-left px-4 py-3">Opened</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y tw-stagger">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No tickets found.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.subject}</div>
                    <div className="text-xs text-gray-400">#{t.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3">
                    {t.user ? (
                      <Link
                        href={`/customers/${t.user.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {t.user.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TWSelect
                      pill
                      value={t.status}
                      onChange={(v) =>
                        updateMutation.mutate({
                          id: t.id,
                          update: { status: v as TicketStatus },
                        })
                      }
                      options={ALL_STATUSES.map((s) => ({
                        value: s,
                        label: s,
                        color: STATUS_DOT[s],
                        bg: STATUS_BG[s],
                      }))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <TWSelect
                      pill
                      value={t.priority}
                      onChange={(v) =>
                        updateMutation.mutate({
                          id: t.id,
                          update: { priority: v as TicketPriority },
                        })
                      }
                      options={ALL_PRIORITIES.map((p) => ({
                        value: p,
                        label: p,
                        color: PRIORITY_DOT[p],
                        bg: PRIORITY_BG[p],
                      }))}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {t.agent?.name ?? "Unassigned"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/tickets/${t.id}`}
                      className="text-blue-600 hover:underline text-xs font-medium"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
