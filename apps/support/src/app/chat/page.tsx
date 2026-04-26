"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Message } from "@trendywheels/types";
import { useEffect, useRef, useState } from "react";

import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

interface Conversation {
  id: string;
  lastMessageAt: string;
  participants: Array<{ userId: string; user?: { name?: string; phone?: string } }>;
  messages: Array<{ id: string; message: string; senderId: string; createdAt: string; readAt?: string | null }>;
}

const CANNED = [
  "Thank you for contacting TrendyWheels support. How can I help you today?",
  "I'm looking into this for you right now. Please hold on for a moment.",
  "I've resolved this issue on our end. Please try again and let me know if the problem persists.",
  "Could you please provide more details about the issue you're experiencing?",
  "Your booking has been confirmed. You'll receive an SMS with the details shortly.",
  "I'll escalate this to our technical team and you'll hear back within 24 hours.",
];

export default function ChatPage(): JSX.Element {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [showCanned, setShowCanned] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.getConversations(),
    refetchInterval: 5000,
  });

  const conversations = (convData?.data ?? []) as Conversation[];

  const { data: msgData, isLoading: msgLoading } = useQuery({
    queryKey: ["messages", activeId],
    queryFn: () => api.getMessages(activeId!),
    enabled: !!activeId,
    refetchInterval: 3000,
  });

  const messages = (msgData?.data ?? []) as Message[];

  const activeConv = conversations.find((c) => c.id === activeId);
  const otherParticipant = activeConv?.participants.find((p) => p.userId !== user?.id);
  const contactName =
    otherParticipant?.user?.name ?? otherParticipant?.user?.phone ?? "Customer";

  useEffect(() => {
    if (conversations.length > 0 && !activeId) {
      setActiveId(conversations[0]?.id ?? null);
    }
  }, [conversations, activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (msg: string) => {
      const recipientId = otherParticipant?.userId ?? "";
      return api.sendMessage(recipientId, msg);
    },
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["messages", activeId] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const send = (msg?: string): void => {
    const toSend = (msg ?? text).trim();
    if (!toSend) return;
    setShowCanned(false);
    sendMutation.mutate(toSend);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Conversation list */}
      <div className="w-72 border-r bg-white flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">Live Chat</h2>
          <p className="text-xs text-gray-400 mt-0.5">{conversations.length} conversations</p>
        </div>

        <div className="flex-1 overflow-auto">
          {convLoading ? (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
              Loading…
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <span className="text-3xl">💬</span>
              <span className="text-sm">No conversations</span>
            </div>
          ) : (
            conversations.map((conv) => {
              const other = conv.participants[0];
              const name = other?.user?.name ?? other?.user?.phone ?? "Customer";
              const lastMsg = conv.messages[0];
              const unread = lastMsg && !lastMsg.readAt;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={`w-full text-left p-4 border-b hover:bg-gray-50 transition ${
                    activeId === conv.id ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${unread ? "font-bold" : "font-medium"}`}>
                          {name}
                        </span>
                        {unread && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {lastMsg?.message ?? "No messages"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat thread */}
      {activeId ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b bg-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              {contactName[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold">{contactName}</div>
              <div className="text-xs text-green-500">Active</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {msgLoading ? (
              <div className="flex items-center justify-center h-24 text-gray-400">Loading…</div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
                No messages yet
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      }`}
                    >
                      <p>{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${isMe ? "text-blue-200 text-right" : "text-gray-400"}`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isMe && msg.readAt && " ✓✓"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t bg-white p-4 space-y-2 relative">
            {showCanned && (
              <div className="absolute bottom-full left-4 right-4 bg-white border rounded-lg shadow-lg mb-1 overflow-hidden z-10">
                <div className="p-2 border-b text-xs font-medium text-gray-500">
                  Canned Responses
                </div>
                {CANNED.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => send(c)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition border-b last:border-0"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowCanned((v) => !v)}
                title="Canned responses"
                className={`px-3 py-2 rounded-md border text-sm font-medium transition ${
                  showCanned ? "bg-blue-50 border-blue-300 text-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                /
              </button>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type a message… (Enter to send)"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => send()}
                disabled={!text.trim() || sendMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition disabled:opacity-40"
              >
                {sendMutation.isPending ? "…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-5xl mb-3">💬</div>
            <p>Select a conversation to start</p>
          </div>
        </div>
      )}
    </div>
  );
}
