"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { KBArticle } from "@trendywheels/types";
import Link from "next/link";
import { useState } from "react";

import { authedFetch } from "../../lib/fetcher";

const CATEGORIES = ["All", "Booking", "Vehicles", "Payments", "Account", "Repairs", "General"];

export default function KBPage(): JSX.Element {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["kb", search, category],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("q", search);
      if (category !== "All") params.set("category", category);
      return authedFetch<{ data: KBArticle[] }>(`/api/kb?${params.toString()}`);
    },
  });

  const articles = data?.data ?? [];

  const rateMutation = useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      authedFetch(`/api/kb/${id}/rate`, {
        method: "PUT",
        body: JSON.stringify({ helpful }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["kb"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      authedFetch(`/api/kb/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setExpandedId(null);
      void qc.invalidateQueries({ queryKey: ["kb"] });
    },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-0.5">{articles.length} articles</p>
        </div>
        <Link
          href="/kb/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition"
        >
          + New Article
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search articles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                category === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
          <span className="text-4xl">📚</span>
          <span>No articles found</span>
          <Link href="/kb/new" className="text-blue-600 hover:underline text-sm">
            Create the first article →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <div key={article.id} className="bg-white rounded-xl border overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {article.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {article.viewsCount} views · {article.helpfulCount} helpful
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900">{article.title}</div>
                </div>
                <span className="text-gray-400 ml-4">{expandedId === article.id ? "▲" : "▼"}</span>
              </button>

              {expandedId === article.id && (
                <div className="border-t">
                  <div className="p-4">
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                      {article.content}
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Was this helpful?</span>
                      <button
                        onClick={() => rateMutation.mutate({ id: article.id, helpful: true })}
                        className="px-3 py-1 border border-green-400 text-green-600 hover:bg-green-50 rounded-md text-xs transition"
                      >
                        👍 Yes
                      </button>
                      <button
                        onClick={() => rateMutation.mutate({ id: article.id, helpful: false })}
                        className="px-3 py-1 border border-red-300 text-red-500 hover:bg-red-50 rounded-md text-xs transition"
                      >
                        👎 No
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        Updated {new Date(article.updatedAt).toLocaleDateString()}
                      </span>
                      <Link
                        href={`/kb/new?edit=${article.id}`}
                        className="px-3 py-1 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-md text-xs transition"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("Delete this article?")) {
                            deleteMutation.mutate(article.id);
                          }
                        }}
                        className="px-3 py-1 border border-red-300 text-red-600 hover:bg-red-50 rounded-md text-xs transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
