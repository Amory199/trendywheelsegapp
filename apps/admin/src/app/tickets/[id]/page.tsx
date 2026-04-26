"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupportTicket, TicketPriority, TicketStatus } from "@trendywheels/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { authedFetch } from "../../../lib/fetcher";

interface TicketDetail extends SupportTicket {
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

export default function AdminTicketDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ticket", id],
    queryFn: () => authedFetch<{ data: TicketDetail }>(`/api/tickets/${id}`),
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: (update: Partial<SupportTicket>) =>
      authedFetch(`/api/tickets/${id}`, {
        method: "PUT",
        body: JSON.stringify(update),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-ticket", id] }),
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;
  const ticket = data?.data;
  if (!ticket) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Ticket not found.</p>
        <Link href="/tickets" className="text-blue-600 hover:underline mt-2 inline-block">
          ← Back to tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 mb-4">
        ← Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold flex-1">{ticket.subject}</h1>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status]}`}
        >
          {ticket.status}
        </span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${PRIORITY_STYLES[ticket.priority]}`}
        >
          {ticket.priority}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Customer report</div>
            <p className="text-sm text-gray-800">{ticket.subject}</p>
            <p className="text-xs text-gray-500 mt-3">
              Submitted {new Date(ticket.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">
              Detailed conversation thread is handled in the support dashboard. Use the controls on
              the right to triage, reassign, or change status from here.
            </p>
            <Link
              href={`/customers/${ticket.userId}`}
              className="text-blue-600 hover:underline text-sm mt-3 inline-block"
            >
              View full customer profile →
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Customer</h3>
            <div className="text-sm">
              <div className="font-medium">{ticket.user?.name ?? "—"}</div>
              <div className="text-xs text-gray-500">{ticket.user?.email}</div>
              <Link
                href={`/customers/${ticket.userId}`}
                className="text-blue-600 hover:underline text-xs mt-2 inline-block"
              >
                Open profile →
              </Link>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Status</h3>
            <div className="flex flex-col gap-1">
              {(["open", "in-progress", "resolved", "closed"] as TicketStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => updateMutation.mutate({ status: s })}
                  disabled={ticket.status === s || updateMutation.isPending}
                  className={`text-left px-3 py-1.5 rounded-md text-sm border transition disabled:opacity-40 ${
                    ticket.status === s
                      ? STATUS_STYLES[s] + " border-transparent font-medium"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Priority</h3>
            <div className="flex flex-col gap-1">
              {(["low", "medium", "high", "urgent"] as TicketPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => updateMutation.mutate({ priority: p })}
                  disabled={ticket.priority === p || updateMutation.isPending}
                  className={`text-left px-3 py-1.5 rounded-md text-sm border transition disabled:opacity-40 ${
                    ticket.priority === p
                      ? PRIORITY_STYLES[p] + " border-transparent font-medium"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
