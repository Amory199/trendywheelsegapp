"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupportTicket, TicketPriority, TicketStatus } from "@trendywheels/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-store";

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

export default function TicketDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [reply, setReply] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => api.getTicket(id),
    enabled: !!id,
  });

  const ticket = data?.data as SupportTicket | undefined;

  const updateMutation = useMutation({
    mutationFn: (update: Partial<SupportTicket>) => api.updateTicket(id, update),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["ticket", id] }),
  });

  const replyMutation = useMutation({
    mutationFn: (message: string) => {
      if (!ticket) throw new Error("No ticket");
      return api.sendMessage(ticket.userId, message);
    },
    onSuccess: () => {
      setReply("");
      void qc.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">Loading ticket…</div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Ticket not found.</p>
        <Link href="/tickets" className="text-blue-600 hover:underline mt-2 block">
          ← Back to tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          ←
        </button>
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
        {/* Thread column */}
        <div className="col-span-2 space-y-4">
          {/* Ticket meta as first "message" */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                C
              </div>
              <div>
                <div className="text-sm font-medium">Customer</div>
                <div className="text-xs text-gray-400">
                  {new Date(ticket.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-700">Ticket: {ticket.subject}</p>
            <p className="text-xs text-gray-400 mt-2">Customer ID: {ticket.userId}</p>
          </div>

          {/* Reply box */}
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                {(user?.name ?? "A")[0].toUpperCase()}
              </div>
              <div className="text-sm font-medium">{user?.name ?? "Agent"} (you)</div>
            </div>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply to the customer…"
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => replyMutation.mutate(reply)}
                disabled={!reply.trim() || replyMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition disabled:opacity-40"
              >
                {replyMutation.isPending ? "Sending…" : "Send Reply"}
              </button>
              <button
                onClick={() => {
                  replyMutation.mutate(reply);
                  updateMutation.mutate({ status: "resolved" });
                }}
                disabled={!reply.trim() || replyMutation.isPending}
                className="px-4 py-2 border border-green-600 text-green-600 hover:bg-green-50 text-sm font-medium rounded-md transition disabled:opacity-40"
              >
                Reply &amp; Resolve
              </button>
            </div>
            {replyMutation.isError && (
              <p className="text-sm text-red-600">Failed to send reply. Please try again.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Ticket Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500 block text-xs">ID</span>
                <span className="font-mono text-xs">{ticket.id.slice(0, 16)}…</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Customer</span>
                <Link
                  href={`/customers/${ticket.userId}`}
                  className="text-blue-600 hover:underline text-xs"
                >
                  View profile →
                </Link>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Created</span>
                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Updated</span>
                <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Change Status</h3>
            <div className="flex flex-col gap-2">
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

          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Change Priority</h3>
            <div className="flex flex-col gap-2">
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
