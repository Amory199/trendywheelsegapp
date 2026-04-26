"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  viewsCount: number;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ["Booking", "Vehicles", "Payments", "Account", "Repairs", "General"];

export default function AdminKBPage(): JSX.Element {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KBArticle | null>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "General" });
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-kb", search],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("q", search);
      return authedFetch<{ data: KBArticle[] }>(`/api/kb?${params}`);
    },
  });

  const articles = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editing) {
        return authedFetch(`/api/kb/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
      }
      return authedFetch("/api/kb", {
        method: "POST",
        body: JSON.stringify(form),
      });
    },
    onSuccess: () => {
      setShowForm(false);
      setEditing(null);
      setForm({ title: "", content: "", category: "General" });
      void qc.invalidateQueries({ queryKey: ["admin-kb"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authedFetch(`/api/kb/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-kb"] }),
  });

  const startEdit = (article: KBArticle): void => {
    setEditing(article);
    setForm({ title: article.title, content: article.content, category: article.category });
    setShowForm(true);
  };

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-sm text-gray-500">{articles.length} articles · published platform-wide.</p>
        </div>
        <div className="flex gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles…"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              setEditing(null);
              setForm({ title: "", content: "", category: "General" });
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
          >
            + New article
          </button>
        </div>
      </header>

      {showForm && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold">{editing ? "Edit article" : "New article"}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 block mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Content (markdown)</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={10}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!form.title.trim() || !form.content.trim() || saveMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-40"
            >
              {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Publish article"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Views</th>
              <th className="text-left px-4 py-3">Helpful</th>
              <th className="text-left px-4 py-3">Updated</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No articles yet — click "New article" to publish your first.
                </td>
              </tr>
            ) : (
              articles.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.title}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {a.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">{a.viewsCount}</td>
                  <td className="px-4 py-3">{a.helpfulCount}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(a.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => startEdit(a)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${a.title}"?`)) deleteMutation.mutate(a.id);
                      }}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Delete
                    </button>
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
