"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";
import { TWSelect } from "../../lib/tw-select";

interface SaleRow {
  id: string;
  userId: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: string | number;
  status: "active" | "sold" | "pending";
  viewsCount: number;
  inquiriesCount: number;
  images: string[];
  createdAt: string;
}

const STATUS_STYLES: Record<SaleRow["status"], string> = {
  active: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  pending: "bg-gray-100 text-gray-600",
};

export default function SalesPage(): JSX.Element {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SaleRow["status"] | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["sales", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      return authedFetch<{ data: SaleRow[] }>(`/api/sales?${params}`);
    },
  });

  const listings = data?.data ?? [];
  const selected = selectedId ? listings.find((l) => l.id === selectedId) ?? null : null;

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales listings</h1>
          <p className="text-sm text-gray-500">{listings.length} listings</p>
        </div>
        <TWSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as SaleRow["status"] | "")}
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Active", color: "#0A6B0A" },
            { value: "sold", label: "Sold", color: "#1338A8" },
            { value: "pending", label: "Taken down", color: "#888899" },
          ]}
        />
      </header>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Vehicle</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Views</th>
              <th className="text-left px-4 py-3">Inquiries</th>
              <th className="text-left px-4 py-3">Listed</th>
              <th className="text-right px-4 py-3">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y tw-stagger">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : listings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No listings.
                </td>
              </tr>
            ) : (
              listings.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedId === l.id ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium">{l.title}</td>
                  <td className="px-4 py-3 text-xs">
                    {l.make} {l.model} ({l.year})
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[l.status]}`}
                    >
                      {l.status === "pending" ? "taken down" : l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{l.viewsCount}</td>
                  <td className="px-4 py-3">{l.inquiriesCount}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(l.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    EGP {Number(l.price ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <SaleDrawer
          listing={selected}
          onClose={() => setSelectedId(null)}
          onChange={() => void qc.invalidateQueries({ queryKey: ["sales"] })}
        />
      )}
    </div>
  );
}

function SaleDrawer({
  listing,
  onClose,
  onChange,
}: {
  listing: SaleRow;
  onClose: () => void;
  onChange: () => void;
}): JSX.Element {
  const markSold = useMutation({
    mutationFn: () => authedFetch(`/api/sales/${listing.id}/mark-sold`, { method: "POST" }),
    onSuccess: () => onChange(),
  });
  const takeDown = useMutation({
    mutationFn: () => authedFetch(`/api/sales/${listing.id}/take-down`, { method: "POST" }),
    onSuccess: () => onChange(),
  });
  const restore = useMutation({
    mutationFn: () => authedFetch(`/api/sales/${listing.id}/restore`, { method: "POST" }),
    onSuccess: () => onChange(),
  });

  const firstImage = Array.isArray(listing.images) ? listing.images[0] : undefined;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white h-full overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{listing.title}</h2>
            <p className="text-xs text-gray-500 mt-1">#{listing.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {firstImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firstImage}
            alt={listing.title}
            className="w-full h-48 object-cover rounded-lg"
          />
        )}

        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <Row label="Vehicle">
            {listing.make} {listing.model} ({listing.year})
          </Row>
          <Row label="Price">EGP {Number(listing.price).toLocaleString()}</Row>
          <Row label="Status">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[listing.status]}`}
            >
              {listing.status === "pending" ? "taken down" : listing.status}
            </span>
          </Row>
          <Row label="Views">{listing.viewsCount}</Row>
          <Row label="Inquiries">{listing.inquiriesCount}</Row>
          <Row label="Owner">
            <Link
              href={`/customers/${listing.userId}`}
              className="text-blue-600 hover:underline"
            >
              View profile
            </Link>
          </Row>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Moderation</div>
          {listing.status === "active" && (
            <>
              <button
                onClick={() => markSold.mutate()}
                disabled={markSold.isPending}
                className="w-full px-4 py-2 border border-blue-500 text-blue-600 hover:bg-blue-50 text-sm font-medium rounded-md disabled:opacity-40"
              >
                {markSold.isPending ? "…" : "Mark as sold"}
              </button>
              <button
                onClick={() => {
                  if (confirm("Take down this listing? It will be hidden from public browse.")) {
                    takeDown.mutate();
                  }
                }}
                disabled={takeDown.isPending}
                className="w-full px-4 py-2 border border-red-500 text-red-600 hover:bg-red-50 text-sm font-medium rounded-md disabled:opacity-40"
              >
                {takeDown.isPending ? "…" : "Take down"}
              </button>
            </>
          )}
          {listing.status === "pending" && (
            <button
              onClick={() => restore.mutate()}
              disabled={restore.isPending}
              className="w-full px-4 py-2 border border-green-500 text-green-600 hover:bg-green-50 text-sm font-medium rounded-md disabled:opacity-40"
            >
              {restore.isPending ? "…" : "Restore listing"}
            </button>
          )}
          {listing.status === "sold" && (
            <p className="text-xs text-gray-500">
              This listing is marked sold. Restore to active to make it visible again.
            </p>
          )}
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
