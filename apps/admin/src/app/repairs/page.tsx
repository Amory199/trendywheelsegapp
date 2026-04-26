"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";
import { TWSelect } from "../../lib/tw-select";

type RepairStatus = "submitted" | "assigned" | "in-progress" | "completed" | "cancelled";

interface RepairRow {
  id: string;
  userId: string;
  vehicleId: string;
  category: string;
  priority: string;
  status: RepairStatus;
  description: string;
  estimatedCost: string | number | null;
  actualCost: string | number | null;
  preferredDate: string | null;
  createdAt: string;
  user?: { id: string; name: string; phone: string };
  vehicle?: { id: string; name: string };
  mechanic?: { id: string; name: string } | null;
}

const STATUS_STYLES: Record<RepairStatus, string> = {
  submitted: "bg-blue-100 text-blue-700",
  assigned: "bg-purple-100 text-purple-700",
  "in-progress": "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function RepairsPage(): JSX.Element {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RepairStatus | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["repairs", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      return authedFetch<{ data: RepairRow[] }>(`/api/repairs?${params}`);
    },
  });

  const repairs = data?.data ?? [];
  const selected = selectedId ? repairs.find((r) => r.id === selectedId) ?? null : null;

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Repair requests</h1>
          <p className="text-sm text-gray-500">{repairs.length} requests</p>
        </div>
        <TWSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as RepairStatus | "")}
          options={[
            { value: "", label: "All statuses" },
            { value: "submitted", label: "Submitted", color: "#1338A8" },
            { value: "assigned", label: "Assigned", color: "#5300A8" },
            { value: "in-progress", label: "In progress", color: "#A87900" },
            { value: "completed", label: "Completed", color: "#0A6B0A" },
            { value: "cancelled", label: "Cancelled", color: "#A00000" },
          ]}
        />
      </header>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Vehicle</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Priority</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Mechanic</th>
              <th className="text-left px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y tw-stagger">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : repairs.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No repairs.</td></tr>
            ) : (
              repairs.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`cursor-pointer hover:bg-gray-50 ${selectedId === r.id ? "bg-blue-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.user?.name ?? "—"}</div>
                    <div className="text-xs text-gray-400">{r.user?.phone}</div>
                  </td>
                  <td className="px-4 py-3">{r.vehicle?.name ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{r.category}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_STYLES[r.priority] ?? "bg-gray-100"}`}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[r.status]}`}>
                      {r.status.replace("-", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.mechanic?.name ?? <span className="text-gray-400">unassigned</span>}</td>
                  <td className="px-4 py-3 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <RepairDrawer
          repair={selected}
          onClose={() => setSelectedId(null)}
          onChange={() => void qc.invalidateQueries({ queryKey: ["repairs"] })}
        />
      )}
    </div>
  );
}

function RepairDrawer({
  repair,
  onClose,
  onChange,
}: {
  repair: RepairRow;
  onClose: () => void;
  onChange: () => void;
}): JSX.Element {
  const startMut = useMutation({
    mutationFn: () => authedFetch(`/api/repairs/${repair.id}/start`, { method: "POST" }),
    onSuccess: () => onChange(),
  });
  const completeMut = useMutation({
    mutationFn: (actualCost?: number) =>
      authedFetch(`/api/repairs/${repair.id}/complete`, {
        method: "POST",
        body: JSON.stringify(typeof actualCost === "number" ? { actualCost } : {}),
      }),
    onSuccess: () => onChange(),
  });
  const cancelMut = useMutation({
    mutationFn: () => authedFetch(`/api/repairs/${repair.id}/cancel`, { method: "POST" }),
    onSuccess: () => onChange(),
  });
  const deleteMut = useMutation({
    mutationFn: () => authedFetch(`/api/repairs/${repair.id}`, { method: "DELETE" }),
    onSuccess: () => {
      onChange();
      onClose();
    },
  });

  const [actualCost, setActualCost] = useState<string>(
    repair.actualCost ? String(repair.actualCost) : "",
  );

  const isClosed = repair.status === "completed" || repair.status === "cancelled";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white h-full overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold capitalize">{repair.category} repair</h2>
            <p className="text-xs text-gray-500 mt-1">#{repair.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <Row label="Customer">
            {repair.user ? (
              <Link href={`/customers/${repair.userId}`} className="text-blue-600 hover:underline">
                {repair.user.name}
              </Link>
            ) : "—"}
          </Row>
          <Row label="Vehicle">{repair.vehicle?.name ?? "—"}</Row>
          <Row label="Priority">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_STYLES[repair.priority] ?? "bg-gray-100"}`}>
              {repair.priority}
            </span>
          </Row>
          <Row label="Status">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[repair.status]}`}>
              {repair.status.replace("-", " ")}
            </span>
          </Row>
          <Row label="Mechanic">{repair.mechanic?.name ?? <span className="text-gray-400">unassigned</span>}</Row>
          {repair.preferredDate ? <Row label="Preferred">{new Date(repair.preferredDate).toLocaleDateString()}</Row> : null}
          {repair.estimatedCost ? <Row label="Est. cost">EGP {Number(repair.estimatedCost).toLocaleString()}</Row> : null}
          {repair.actualCost ? <Row label="Final cost">EGP {Number(repair.actualCost).toLocaleString()}</Row> : null}
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Description</div>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{repair.description}</p>
        </div>

        {!isClosed && (
          <div className="border-t pt-4 space-y-2">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Workflow</div>
            {(repair.status === "submitted" || repair.status === "assigned") && (
              <button
                onClick={() => startMut.mutate()}
                disabled={startMut.isPending}
                className="w-full px-4 py-2 border border-yellow-500 text-yellow-600 hover:bg-yellow-50 text-sm font-medium rounded-md disabled:opacity-40"
              >
                {startMut.isPending ? "…" : "Start work"}
              </button>
            )}
            {repair.status === "in-progress" && (
              <div className="space-y-2">
                <input
                  type="number"
                  min={0}
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="Final cost (EGP, optional)"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => completeMut.mutate(actualCost ? Number(actualCost) : undefined)}
                  disabled={completeMut.isPending}
                  className="w-full px-4 py-2 border border-green-500 text-green-600 hover:bg-green-50 text-sm font-medium rounded-md disabled:opacity-40"
                >
                  {completeMut.isPending ? "…" : "Mark as completed"}
                </button>
              </div>
            )}
            <button
              onClick={() => {
                if (confirm("Cancel this repair? Customer will be notified.")) cancelMut.mutate();
              }}
              disabled={cancelMut.isPending}
              className="w-full px-4 py-2 border border-red-500 text-red-600 hover:bg-red-50 text-sm font-medium rounded-md disabled:opacity-40"
            >
              {cancelMut.isPending ? "…" : "Cancel repair"}
            </button>
          </div>
        )}

        <div className="border-t pt-4">
          <button
            onClick={() => {
              if (confirm("Permanently delete this repair record? This cannot be undone.")) deleteMut.mutate();
            }}
            disabled={deleteMut.isPending}
            className="w-full px-4 py-2 text-xs text-gray-400 hover:text-red-600 transition"
          >
            Delete record
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800">{children}</span>
    </div>
  );
}
