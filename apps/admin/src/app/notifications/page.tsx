"use client";

import { useQuery } from "@tanstack/react-query";

import { authedFetch } from "../../lib/fetcher";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string | null };
}

const TYPE_BADGE: Record<string, string> = {
  booking: "bg-blue-100 text-blue-700",
  repair: "bg-orange-100 text-orange-700",
  payment: "bg-green-100 text-green-700",
  message: "bg-purple-100 text-purple-700",
  system: "bg-gray-100 text-gray-700",
};

export default function AdminNotificationsPage(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () =>
      authedFetch<{ data: NotificationRow[]; total: number }>(
        "/api/admin/notifications?limit=100",
      ),
  });

  const rows = data?.data ?? [];
  const unread = rows.filter((n) => !n.readAt).length;

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Notifications Feed</h1>
        <p className="text-sm text-gray-500">
          {data?.total ?? 0} notifications · {unread} unread (across all users).
        </p>
      </header>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Recipient</th>
              <th className="text-left px-4 py-3">Sent</th>
              <th className="text-left px-4 py-3">Read</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No notifications yet.
                </td>
              </tr>
            ) : (
              rows.map((n) => (
                <tr key={n.id} className={`hover:bg-gray-50 ${!n.readAt ? "bg-blue-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        TYPE_BADGE[n.type] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {n.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{n.title}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{n.body}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{n.user.name}</div>
                    <div className="text-xs text-gray-400">{n.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {n.readAt ? new Date(n.readAt).toLocaleString() : "—"}
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
