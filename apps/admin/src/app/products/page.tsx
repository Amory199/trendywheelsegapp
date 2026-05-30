"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@trendywheels/ui-brand/empty-state";
import { useState } from "react";
import type { JSX } from "react";

import { authedFetch } from "../../lib/fetcher";

type Category = "cart_new" | "cart_used" | "parts" | "accessory";
const CATEGORIES: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cart_new", label: "New carts" },
  { id: "cart_used", label: "Used carts" },
  { id: "parts", label: "Parts" },
  { id: "accessory", label: "Accessories" },
];

interface Product {
  id: string;
  category: Category;
  name: string;
  priceEgp: string;
  brand?: string | null;
  inStock: boolean;
  stockCount?: number | null;
  images: string[];
  createdAt: string;
}

export default function AdminProductsPage(): JSX.Element {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Category | "all">("all");
  const [showCreate, setShowCreate] = useState(false);

  const q = useQuery({
    queryKey: ["admin-products", tab],
    queryFn: () => {
      const url =
        tab === "all" ? "/api/products?limit=100" : `/api/products?category=${tab}&limit=100`;
      return authedFetch<{ data: Product[] }>(url);
    },
  });
  const items = q.data?.data ?? [];

  const remove = useMutation({
    mutationFn: (id: string) => authedFetch(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-bold">Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">Carts, parts, and accessories.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          + Add product
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {CATEGORIES.map((c) => {
          const active = tab === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                active ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-700"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {q.isLoading ? (
        <div className="text-gray-500 py-12 text-center">Loading…</div>
      ) : items.length === 0 ? (
        tab === "all" ? (
          <EmptyState
            icon="📦"
            title="No products in your catalog yet"
            description="Add carts, parts, or accessories so customers can browse and buy from the mobile app's shop."
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
              >
                + Add your first product
              </button>
            }
          />
        ) : (
          <div className="text-gray-500 py-12 text-center">No products in this category.</div>
        )
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Image</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Brand</th>
                <th className="text-right px-4 py-3">Price (EGP)</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">
                    <div
                      className="w-12 h-12 rounded-md bg-gray-100 bg-cover bg-center"
                      style={{ backgroundImage: p.images[0] ? `url(${p.images[0]})` : undefined }}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 capitalize text-gray-500">
                    {p.category.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.brand ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {Number(p.priceEgp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.inStock ? (
                      p.stockCount != null ? (
                        <span className="text-gray-700">{p.stockCount}</span>
                      ) : (
                        <span className="text-green-600">In stock</span>
                      )
                    ) : (
                      <span className="text-red-600">Out</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Remove ${p.name}? It'll be marked out of stock (preserves order history).`,
                          )
                        ) {
                          remove.mutate(p.id);
                        }
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate ? <CreateDrawer onClose={() => setShowCreate(false)} /> : null}
    </div>
  );
}

function CreateDrawer({ onClose }: { onClose: () => void }): JSX.Element {
  const qc = useQueryClient();
  const [category, setCategory] = useState<Category>("parts");
  const [name, setName] = useState("");
  const [priceEgp, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [stockCount, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const create = useMutation({
    mutationFn: () =>
      authedFetch("/api/products", {
        method: "POST",
        body: JSON.stringify({
          category,
          name,
          priceEgp: Number(priceEgp),
          brand: brand || undefined,
          model: model || undefined,
          year: year ? Number(year) : undefined,
          stockCount: stockCount ? Number(stockCount) : undefined,
          description: description || undefined,
          images: imageUrl ? [imageUrl] : [],
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      onClose();
    },
  });

  const isCart = category === "cart_new" || category === "cart_used";

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center sm:justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:h-full overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">New product</h2>
        <div className="space-y-3">
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full p-2.5 border rounded-lg"
            >
              {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border rounded-lg"
            />
          </Field>
          <Field label="Price (EGP)">
            <input
              type="number"
              value={priceEgp}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-2.5 border rounded-lg"
            />
          </Field>
          <Field label="Brand">
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full p-2.5 border rounded-lg"
            />
          </Field>
          {isCart ? (
            <>
              <Field label="Model">
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-2.5 border rounded-lg"
                />
              </Field>
              <Field label="Year">
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full p-2.5 border rounded-lg"
                />
              </Field>
            </>
          ) : (
            <Field label="Stock count">
              <input
                type="number"
                value={stockCount}
                onChange={(e) => setStock(e.target.value)}
                className="w-full p-2.5 border rounded-lg"
              />
            </Field>
          )}
          <Field label="Image URL">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="w-full p-2.5 border rounded-lg"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-2.5 border rounded-lg"
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button
            disabled={!name || !priceEgp || create.isPending}
            onClick={() => create.mutate()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {create.isPending ? "Saving…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      {children}
    </div>
  );
}
