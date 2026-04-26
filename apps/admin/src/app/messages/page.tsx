"use client";

import { useQuery } from "@tanstack/react-query";

import { authedFetch } from "../../lib/fetcher";

interface ConversationRow {
  id: string;
  lastMessageAt: string | null;
  participants: Array<{
    user: { id: string; name: string; email: string | null };
  }>;
  messages: Array<{
    id: string;
    message: string;
    senderId: string;
    createdAt: string;
  }>;
}

export default function AdminMessagesPage(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: () =>
      authedFetch<{ data: ConversationRow[]; total: number }>(
        "/api/admin/conversations?limit=50",
      ),
  });

  const conversations = data?.data ?? [];

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-gray-500">
          {data?.total ?? 0} conversations across the platform.
        </p>
      </header>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Participants</th>
              <th className="text-left px-4 py-3">Last message</th>
              <th className="text-left px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : conversations.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  No conversations yet.
                </td>
              </tr>
            ) : (
              conversations.map((c) => {
                const last = c.messages[0];
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.participants.map((p) => (
                          <span
                            key={p.user.id}
                            className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                          >
                            {p.user.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-800 line-clamp-1 max-w-xl">
                        {last?.message ?? <span className="text-gray-400">No messages</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {c.lastMessageAt
                        ? new Date(c.lastMessageAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
