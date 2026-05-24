"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Vehicle } from "@trendywheels/types";
import { LISTING_STATUS_CLASS } from "@trendywheels/ui-tokens";
import Link from "next/link";
import { useState } from "react";
import type { JSX } from "react";

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

interface FleetSaleRow {
  source: "fleet";
  id: string;
  name: string;
  type: string;
  salePrice: number;
  saleDescription: string | null;
  listingType: "sale" | "both";
  status: string;
  location: string;
  images: { url: string }[];
}

export default function SalesPage(): JSX.Element {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SaleRow["status"] | "">("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["sales", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      return authedFetch<{ data: SaleRow[] }>(`/api/sales?${params}`);
    },
  });

  const fleetSaleQ = useQuery({
    queryKey: ["fleet-sale-listings"],
    queryFn: async () => {
      const res = await authedFetch<{ data: Vehicle[] }>("/api/vehicles?limit=200");
      return res.data.filter((v) => v.listingType === "sale" || v.listingType === "both");
    },
  });

  const listings = data?.data ?? [];
  const fleetForSale = fleetSaleQ.data ?? [];
  const selected = selectedId ? (listings.find((l) => l.id === selectedId) ?? null) : null;

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales board</h1>
          <p className="text-sm text-gray-500">
            {fleetForSale.length} from your fleet · {listings.length} customer listing
            {listings.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
          >
            + Create listing
          </button>
        </div>
      </header>

      {fleetForSale.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            From your fleet ({fleetForSale.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fleetForSale.map((v) => (
              <Link
                key={v.id}
                href={`/vehicles/${v.id}`}
                className="bg-white border rounded-xl p-4 hover:shadow-sm transition block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900">{v.name}</div>
                    <div className="text-xs text-gray-500 capitalize">
                      {v.type} · {v.location}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      v.listingType === "both"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {v.listingType === "both" ? "Rent + Sale" : "For sale"}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-purple-700">
                    EGP {Number(v.salePrice ?? 0).toLocaleString()}
                  </span>
                  {v.listingType === "both" && (
                    <span className="text-xs text-gray-500">
                      · also {Number(v.dailyRate).toLocaleString()} EGP/day
                    </span>
                  )}
                </div>
                {v.saleDescription && (
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">{v.saleDescription}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Customer listings ({listings.length})
        </h2>
      </div>

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
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${LISTING_STATUS_CLASS[l.status]}`}
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

      {showCreate && (
        <CreateListingDrawer
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            void qc.invalidateQueries({ queryKey: ["sales"] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function CreateListingDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}): JSX.Element {
  const [form, setForm] = useState({
    title: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    mileage: 0,
    price: 0,
    transmission: "automatic" as "automatic" | "manual",
    fuelType: "electric" as "electric" | "gasoline" | "hybrid",
    color: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => authedFetch("/api/sales", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: onCreated,
    onError: (e: Error) => setError(e.message),
  });

  const valid =
    form.title.length >= 5 &&
    form.make.length > 0 &&
    form.model.length > 0 &&
    form.price > 0 &&
    form.color.length > 0 &&
    form.description.length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white h-full overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">New sales listing</h2>
            <p className="text-xs text-gray-500 mt-1">
              For used carts being sold — separate from the rental fleet.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Make" value={form.make} onChange={(v) => setForm({ ...form, make: v })} />
          <Field
            label="Model"
            value={form.model}
            onChange={(v) => setForm({ ...form, model: v })}
          />
          <Field
            label="Year"
            type="number"
            value={String(form.year)}
            onChange={(v) => setForm({ ...form, year: Number(v) })}
          />
          <Field
            label="Mileage (km)"
            type="number"
            value={String(form.mileage)}
            onChange={(v) => setForm({ ...form, mileage: Number(v) })}
          />
          <Field
            label="Price (EGP)"
            type="number"
            value={String(form.price)}
            onChange={(v) => setForm({ ...form, price: Number(v) })}
          />
          <Field
            label="Color"
            value={form.color}
            onChange={(v) => setForm({ ...form, color: v })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Transmission</label>
            <select
              value={form.transmission}
              onChange={(e) =>
                setForm({ ...form, transmission: e.target.value as "automatic" | "manual" })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Fuel type</label>
            <select
              value={form.fuelType}
              onChange={(e) =>
                setForm({
                  ...form,
                  fuelType: e.target.value as "electric" | "gasoline" | "hybrid",
                })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="electric">Electric</option>
              <option value="gasoline">Gasoline</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}

        <div className="flex gap-2 pt-2 border-t">
          <button
            onClick={() => create.mutate()}
            disabled={!valid || create.isPending}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-40"
          >
            {create.isPending ? "Creating…" : "Create listing"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded-md"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500 block mb-1">{label}</span>
      <input
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      />
    </label>
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
              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${LISTING_STATUS_CLASS[listing.status]}`}
            >
              {listing.status === "pending" ? "taken down" : listing.status}
            </span>
          </Row>
          <Row label="Views">{listing.viewsCount}</Row>
          <Row label="Inquiries">{listing.inquiriesCount}</Row>
          <Row label="Owner">
            <Link href={`/customers/${listing.userId}`} className="text-blue-600 hover:underline">
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
