"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface Vehicle {
  id: string;
  name: string;
  type: string;
}

interface MaintenanceItem {
  id: string;
  vehicleId: string;
  type: string;
  description: string | null;
  scheduledAt: string;
  completedAt: string | null;
  cost: string | number | null;
  notes: string | null;
  vehicle: { id: string; name: string; type: string } | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MAINTENANCE_TYPES = [
  "Oil change",
  "Tire rotation",
  "Brake service",
  "Battery check",
  "Engine inspection",
  "Detail/cleaning",
  "Annual service",
  "Transmission",
  "Other",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function MaintenancePage(): JSX.Element {
  const qc = useQueryClient();
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [view, setView] = useState<"calendar" | "list">("list");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    vehicleId: "",
    type: "Oil change",
    description: "",
    scheduledAt: new Date().toISOString().slice(0, 16),
    cost: "",
    notes: "",
  });

  const vehiclesQ = useQuery<{ data: Vehicle[] }>({
    queryKey: ["maintenance-vehicles"],
    queryFn: () => authedFetch("/api/vehicles?limit=200"),
  });

  const itemsQ = useQuery<{ data: MaintenanceItem[] }>({
    queryKey: ["maintenance"],
    queryFn: () => authedFetch("/api/maintenance"),
    refetchInterval: 30_000,
  });

  const items = itemsQ.data?.data ?? [];
  const vehicles = vehiclesQ.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      authedFetch("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: form.vehicleId,
          type: form.type,
          description: form.description || undefined,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          cost: form.cost ? Number(form.cost) : undefined,
          notes: form.notes || undefined,
        }),
      }),
    onSuccess: () => {
      setShowForm(false);
      setForm({
        vehicleId: "",
        type: "Oil change",
        description: "",
        scheduledAt: new Date().toISOString().slice(0, 16),
        cost: "",
        notes: "",
      });
      void qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      authedFetch(`/api/maintenance/${id}/complete`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authedFetch(`/api/maintenance/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const calDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const itemsOnDay = (day: number): MaintenanceItem[] => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return items.filter((m) => m.scheduledAt.startsWith(dateStr));
  };

  const prevMonth = (): void => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };

  const nextMonth = (): void => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const upcoming = items.filter((m) => !m.completedAt);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Maintenance</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {upcoming.length} upcoming · {items.length - upcoming.length} completed
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 rounded-md text-sm border transition ${view === "list" ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-300 hover:bg-gray-50"}`}
          >
            ☰ List
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-3 py-1.5 rounded-md text-sm border transition ${view === "calendar" ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-300 hover:bg-gray-50"}`}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition"
          >
            + Schedule
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-6 space-y-4">
          <h2 className="font-semibold">Schedule maintenance</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Vehicle</label>
              <select
                value={form.vehicleId}
                onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select vehicle…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {MAINTENANCE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Scheduled at</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Estimated cost (EGP)</label>
              <input
                type="number"
                min={0}
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                placeholder="optional"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Mechanic, parts needed, anything else…"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.vehicleId || !form.type || createMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition disabled:opacity-40"
            >
              {createMutation.isPending ? "Saving…" : "Save appointment"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded-md transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {view === "calendar" ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">←</button>
            <h2 className="font-semibold">{MONTHS[calMonth]} {calYear}</h2>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">→</button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 border-b">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {emptyDays.map((i) => (
              <div key={`e${i}`} className="h-24 border-b border-r" />
            ))}
            {calDays.map((day) => {
              const dayItems = itemsOnDay(day);
              const isToday =
                day === today.getDate() &&
                calMonth === today.getMonth() &&
                calYear === today.getFullYear();
              return (
                <div key={day} className="h-24 border-b border-r p-1 overflow-hidden">
                  <div
                    className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-1 ${
                      isToday ? "bg-emerald-600 text-white" : "text-gray-700"
                    }`}
                  >
                    {day}
                  </div>
                  {dayItems.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      className={`text-xs rounded px-1 truncate mb-0.5 ${m.completedAt ? "bg-gray-100 text-gray-500 line-through" : "bg-yellow-100 text-yellow-700"}`}
                      title={`${m.vehicle?.name ?? ""} — ${m.type}`}
                    >
                      {m.type}
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="text-xs text-gray-400">+{dayItems.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {itemsQ.isLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <span className="text-4xl">🔧</span>
              <span>No maintenance scheduled</span>
            </div>
          ) : (
            items.map((m) => {
              const isDone = !!m.completedAt;
              const isOverdue = !isDone && new Date(m.scheduledAt) < new Date();
              return (
                <div key={m.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{m.type}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-sm text-gray-700">{m.vehicle?.name ?? "—"}</span>
                        {isDone ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Completed</span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Scheduled</span>
                        )}
                      </div>
                      {m.description ? <p className="text-sm text-gray-600">{m.description}</p> : null}
                      <p className="text-xs text-gray-400 mt-1">
                        📅 {new Date(m.scheduledAt).toLocaleString()}
                        {m.cost ? ` · EGP ${Number(m.cost).toLocaleString()}` : ""}
                        {isDone ? ` · done ${new Date(m.completedAt!).toLocaleDateString()}` : ""}
                      </p>
                      {m.notes ? <p className="text-xs text-gray-500 mt-1 italic">{m.notes}</p> : null}
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {!isDone ? (
                        <button
                          onClick={() => completeMutation.mutate(m.id)}
                          disabled={completeMutation.isPending}
                          className="px-3 py-1 text-xs font-medium border border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                        >
                          ✓ Mark done
                        </button>
                      ) : null}
                      <button
                        onClick={() => {
                          if (confirm("Delete this maintenance record?")) deleteMutation.mutate(m.id);
                        }}
                        className="px-2 py-1 text-xs text-gray-400 hover:text-red-600 transition"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
