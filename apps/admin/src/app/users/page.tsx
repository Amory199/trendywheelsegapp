"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { authedFetch } from "../../lib/fetcher";
import { TWSelect } from "../../lib/tw-select";

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  accountType: "customer" | "admin" | "staff";
  status: "active" | "suspended" | "inactive";
  loyaltyTier: "bronze" | "silver" | "gold" | "platinum";
  loyaltyPoints: number;
  createdAt: string;
}

const STATUS_STYLES: Record<UserRow["status"], string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  inactive: "bg-gray-100 text-gray-600",
};

export default function UsersPage(): JSX.Element {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => authedFetch<{ data: UserRow[] }>("/api/users?limit=100"),
  });

  const users = data?.data ?? [];
  const selected = selectedId ? (users.find((u) => u.id === selectedId) ?? null) : null;

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-gray-500">{users.length} users — click a row to manage.</p>
      </header>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Loyalty</th>
            </tr>
          </thead>
          <tbody className="divide-y tw-stagger">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No users.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedId === u.id ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium">{u.name || "—"}</td>
                  <td className="px-4 py-3">{u.phone}</td>
                  <td className="px-4 py-3">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-xs capitalize">{u.accountType}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[u.status]}`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.loyaltyTier} · {u.loyaltyPoints} pts
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <UserDrawer
          user={selected}
          onClose={() => setSelectedId(null)}
          onChange={() => void qc.invalidateQueries({ queryKey: ["users"] })}
        />
      )}
    </div>
  );
}

function UserDrawer({
  user,
  onClose,
  onChange,
}: {
  user: UserRow;
  onClose: () => void;
  onChange: () => void;
}): JSX.Element {
  const [draft, setDraft] = useState({
    name: user.name,
    email: user.email ?? "",
    phone: user.phone,
    accountType: user.accountType,
  });

  useEffect(() => {
    setDraft({
      name: user.name,
      email: user.email ?? "",
      phone: user.phone,
      accountType: user.accountType,
    });
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: () =>
      authedFetch(`/api/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: draft.name,
          email: draft.email || null,
          phone: draft.phone,
          accountType: draft.accountType,
        }),
      }),
    onSuccess: () => onChange(),
  });

  const disableMutation = useMutation({
    mutationFn: () => authedFetch(`/api/users/${user.id}/disable`, { method: "POST" }),
    onSuccess: () => onChange(),
  });

  const enableMutation = useMutation({
    mutationFn: () => authedFetch(`/api/users/${user.id}/enable`, { method: "POST" }),
    onSuccess: () => onChange(),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white h-full overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-xs text-gray-500 mt-1">#{user.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <Field
            label="Name"
            value={draft.name}
            onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
          />
          <Field
            label="Email"
            value={draft.email}
            onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
          />
          <Field
            label="Phone"
            value={draft.phone}
            onChange={(v) => setDraft((d) => ({ ...d, phone: v }))}
          />
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Account type</label>
            <TWSelect
              value={draft.accountType}
              onChange={(v) =>
                setDraft((d) => ({ ...d, accountType: v as UserRow["accountType"] }))
              }
              width="100%"
              options={[
                { value: "customer", label: "Customer", color: "#1338A8" },
                { value: "staff", label: "Staff", color: "#5300A8" },
                { value: "admin", label: "Admin", color: "#FF0065" },
              ]}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-40"
          >
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/customers/${user.id}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm rounded-md flex items-center"
          >
            Profile →
          </Link>
        </div>

        <div className="border-t pt-4">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Account state</div>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[user.status]}`}
            >
              {user.status}
            </span>
            {user.status === "active" ? (
              <button
                onClick={() => {
                  if (confirm("Disable this account? Active sessions will be revoked.")) {
                    disableMutation.mutate();
                  }
                }}
                disabled={disableMutation.isPending}
                className="px-3 py-1.5 border border-red-500 text-red-600 hover:bg-red-50 text-xs font-medium rounded-md disabled:opacity-40"
              >
                {disableMutation.isPending ? "…" : "Disable account"}
              </button>
            ) : (
              <button
                onClick={() => enableMutation.mutate()}
                disabled={enableMutation.isPending}
                className="px-3 py-1.5 border border-green-500 text-green-600 hover:bg-green-50 text-xs font-medium rounded-md disabled:opacity-40"
              >
                {enableMutation.isPending ? "…" : "Re-enable account"}
              </button>
            )}
          </div>
        </div>

        <LoyaltyAdjust user={user} onChange={onChange} />

        <div className="border-t pt-4 text-xs text-gray-500">
          Joined {new Date(user.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

function LoyaltyAdjust({ user, onChange }: { user: UserRow; onChange: () => void }): JSX.Element {
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const adjustMutation = useMutation({
    mutationFn: () =>
      authedFetch(`/api/admin/users/${user.id}/loyalty-adjust`, {
        method: "POST",
        body: JSON.stringify({ points: Number(points), reason }),
      }),
    onSuccess: () => {
      setPoints("");
      setReason("");
      onChange();
    },
  });

  const parsed = Number(points);
  const valid =
    points !== "" && Number.isFinite(parsed) && parsed !== 0 && reason.trim().length > 0;

  return (
    <div className="border-t pt-4">
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Loyalty</div>
      <div className="text-sm mb-3">
        <span className="font-medium capitalize">{user.loyaltyTier}</span> ·{" "}
        <span className="font-mono">{user.loyaltyPoints}</span> pts
      </div>
      <div className="flex gap-2 mb-2">
        <input
          type="number"
          value={points}
          placeholder="±points (e.g. 500 or -250)"
          onChange={(e) => setPoints(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <input
        type="text"
        value={reason}
        placeholder="Reason (required, audited)"
        onChange={(e) => setReason(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
      />
      <button
        onClick={() => adjustMutation.mutate()}
        disabled={!valid || adjustMutation.isPending}
        className="w-full px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-md disabled:opacity-40"
      >
        {adjustMutation.isPending
          ? "Adjusting…"
          : parsed > 0
            ? `Award +${parsed} pts`
            : parsed < 0
              ? `Deduct ${parsed} pts`
              : "Adjust loyalty"}
      </button>
      {adjustMutation.isError ? (
        <div className="text-xs text-red-600 mt-2">
          {(adjustMutation.error as Error)?.message ?? "Failed"}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500 block mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
