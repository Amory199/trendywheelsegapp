"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { readToken, ACCESS_KEY } from "../lib/api";

interface MetricsResponse {
  data: {
    users: { total: number };
    bookings: { active: number };
    vehicles: { available: number; total: number };
    repairs: { pending: number };
    sales: { active: number };
    support: { open: number };
    revenue: { total: number };
  };
}

interface ActivityResponse {
  data: {
    bookings: Array<{
      id: string;
      createdAt: string;
      user?: { name: string };
      vehicle?: { name: string };
    }>;
    repairs: Array<{ id: string; createdAt: string; description: string }>;
    listings: Array<{ id: string; createdAt: string; title: string }>;
  };
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function authedJson<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}` },
  });
  if (!res.ok) throw new Error(`${path} failed`);
  return res.json();
}

const PIE_COLORS = ["#7c3aed", "#a855f7", "#c084fc", "#e9d5ff", "#f0abfc"];

export default function DashboardPage(): JSX.Element {
  const metricsQ = useQuery({
    queryKey: ["metrics"],
    queryFn: () => authedJson<MetricsResponse>("/api/admin/metrics"),
  });
  const activityQ = useQuery({
    queryKey: ["activity"],
    queryFn: () => authedJson<ActivityResponse>("/api/admin/recent-activity"),
  });

  const m = metricsQ.data?.data;
  const cards = [
    { label: "Active bookings", value: m?.bookings.active ?? "—" },
    { label: "Revenue (EGP)", value: m ? m.revenue.total.toLocaleString() : "—" },
    { label: "Users", value: m?.users.total ?? "—" },
    { label: "Vehicles available", value: m ? `${m.vehicles.available}/${m.vehicles.total}` : "—" },
    { label: "Active sales", value: m?.sales.active ?? "—" },
    { label: "Pending repairs", value: m?.repairs.pending ?? "—" },
  ];

  const barData = m
    ? [
        { name: "Bookings", value: m.bookings.active },
        { name: "Sales", value: m.sales.active },
        { name: "Repairs", value: m.repairs.pending },
        { name: "Tickets", value: m.support.open },
      ]
    : [];
  const pieData = m
    ? [
        { name: "Customers", value: m.users.total },
        { name: "Vehicles", value: m.vehicles.total },
        { name: "Bookings", value: m.bookings.active },
      ]
    : [];

  const a = activityQ.data?.data;
  const activity = [
    ...(a?.bookings ?? []).map((b) => ({
      type: "booking",
      id: b.id,
      label: `${b.user?.name ?? "Customer"} booked ${b.vehicle?.name ?? "a vehicle"}`,
      createdAt: b.createdAt,
    })),
    ...(a?.repairs ?? []).map((r) => ({
      type: "repair",
      id: r.id,
      label: r.description?.slice(0, 60) ?? "Repair request",
      createdAt: r.createdAt,
    })),
    ...(a?.listings ?? []).map((l) => ({
      type: "sale",
      id: l.id,
      label: l.title,
      createdAt: l.createdAt,
    })),
  ]
    .sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt))
    .slice(0, 12);

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Live overview of your TrendyWheels platform</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Activity by module</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Recent activity</h2>
        {activityQ.isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <ul className="divide-y">
            {activity.map((item) => (
              <li key={`${item.type}-${item.id}`} className="py-2 text-sm flex justify-between">
                <span>
                  <span className="inline-block bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded mr-2">
                    {item.type}
                  </span>
                  {item.label}
                </span>
                <span className="text-gray-400 text-xs">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
            {activity.length === 0 ? (
              <li className="py-2 text-sm text-gray-400">No recent activity.</li>
            ) : null}
          </ul>
        )}
      </section>
    </div>
  );
}
