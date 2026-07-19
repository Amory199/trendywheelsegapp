"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type JSX } from "react";

import { authedFetch } from "../../../lib/fetcher";

interface Participant {
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    accountType: string;
  };
}

interface Msg {
  id: string;
  message: string;
  senderId: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  lastMessageAt: string | null;
  // All null on plain support/DM threads; set when the chat is about a record.
  contextType: string | null;
  contextId: string | null;
  contextTitle: string | null;
  participants: Participant[];
  messages: Msg[];
}

const CONTEXT_LABELS: Record<string, string> = {
  booking: "Booking",
  reservation: "Reservation",
  repair: "Repair",
  order: "Order",
  listing: "Listing",
};

const CONTEXT_STYLES: Record<string, string> = {
  booking: "bg-blue-100 text-blue-700",
  reservation: "bg-purple-100 text-purple-700",
  repair: "bg-amber-100 text-amber-700",
  order: "bg-green-100 text-green-700",
  listing: "bg-pink-100 text-pink-700",
};

export default function AdminConversationPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-conversation", id],
    queryFn: () => authedFetch<{ data: Conversation }>(`/api/admin/conversations/${id}`),
  });

  const conversation = data?.data;
  const customer = conversation?.participants.find((p) => p.user.accountType === "customer")?.user;
  const nameById = new Map(conversation?.participants.map((p) => [p.user.id, p.user]) ?? []);

  const send = useMutation({
    mutationFn: (message: string) =>
      authedFetch(`/api/admin/conversations/${id}/reply`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onSuccess: () => {
      setReply("");
      void qc.invalidateQueries({ queryKey: ["admin-conversation", id] });
      void qc.invalidateQueries({ queryKey: ["admin-conversations"] });
    },
  });

  const onSend = (): void => {
    const m = reply.trim();
    if (m) send.mutate(m);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
      <header className="mb-4">
        <Link href="/messages" className="text-sm text-gray-500 hover:text-gray-800">
          ← Back to messages
        </Link>
        <h1 className="text-2xl font-bold mt-1">{customer ? customer.name : "Conversation"}</h1>
        {customer ? <p className="text-sm text-gray-500">{customer.phone}</p> : null}
      </header>

      {conversation?.contextType ? (
        <div className="mb-3 bg-white border rounded-lg px-4 py-3 flex items-center gap-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
              CONTEXT_STYLES[conversation.contextType] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {CONTEXT_LABELS[conversation.contextType] ?? conversation.contextType}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {conversation.contextTitle ?? "Linked record"}
            </div>
            {conversation.contextId ? (
              <div className="text-xs text-gray-500 font-mono truncate">
                {conversation.contextId}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg border p-4 space-y-3">
        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Loading…</div>
        ) : !conversation || conversation.messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No messages yet.</div>
        ) : (
          conversation.messages.map((m) => {
            const sender = nameById.get(m.senderId);
            const fromCustomer = sender?.accountType === "customer";
            return (
              <div key={m.id} className={`flex ${fromCustomer ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    fromCustomer ? "bg-white border text-gray-800" : "bg-[#2B0FF8] text-white"
                  }`}
                >
                  <div
                    className={`text-[10px] mb-0.5 ${
                      fromCustomer ? "text-gray-400" : "text-white/70"
                    }`}
                  >
                    {sender?.name ?? "Unknown"} · {new Date(m.createdAt).toLocaleString()}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{m.message}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 flex gap-2 items-end">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend();
          }}
          rows={2}
          maxLength={2000}
          placeholder="Type a reply… (⌘/Ctrl+Enter to send)"
          className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2B0FF8]/30"
        />
        <button
          onClick={onSend}
          disabled={!reply.trim() || send.isPending}
          className="bg-[#2B0FF8] text-white font-semibold px-5 py-2.5 rounded-lg disabled:opacity-40"
        >
          {send.isPending ? "Sending…" : "Send"}
        </button>
      </div>
      {send.isError ? (
        <p className="text-xs text-red-600 mt-1">
          {(send.error as Error)?.message ?? "Failed to send"}
        </p>
      ) : null}
    </div>
  );
}
