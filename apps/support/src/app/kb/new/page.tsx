"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { KBArticle } from "@trendywheels/types";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { authedFetch } from "../../../lib/fetcher";

const CATEGORIES = ["Booking", "Vehicles", "Payments", "Account", "Repairs", "General"];

function KBEditor(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [preview, setPreview] = useState(false);

  const { data: existingData } = useQuery({
    queryKey: ["kb-article", editId],
    queryFn: () => authedFetch<{ data: KBArticle }>(`/api/kb/${editId}`),
    enabled: !!editId,
  });

  useEffect(() => {
    if (existingData?.data) {
      const article = existingData.data;
      setTitle(article.title);
      setContent(article.content);
      setCategory(article.category);
    }
  }, [existingData]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { title, content, category };
      if (editId) {
        return authedFetch(`/api/kb/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      return authedFetch("/api/kb", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["kb"] });
      router.push("/kb");
    },
  });

  const canSave = title.trim().length > 3 && content.trim().length > 10 && !saveMutation.isPending;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          ←
        </button>
        <h1 className="text-2xl font-bold flex-1">
          {editId ? "Edit Article" : "New Article"}
        </h1>
        <button
          onClick={() => setPreview((v) => !v)}
          className={`px-3 py-1.5 border rounded-md text-sm transition ${
            preview ? "bg-gray-100 border-gray-400" : "border-gray-300 hover:bg-gray-50"
          }`}
        >
          {preview ? "Edit" : "Preview"}
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition disabled:opacity-40"
        >
          {saveMutation.isPending ? "Saving…" : editId ? "Update" : "Publish"}
        </button>
      </div>

      {saveMutation.isError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          Failed to save article. Please try again.
        </div>
      )}

      {preview ? (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {category}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{title || "Untitled"}</h2>
          <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
            {content || <span className="text-gray-400">No content yet…</span>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How to cancel a booking"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Content</label>
              <span className="text-xs text-gray-400">{content.length} chars</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article content here. Supports plain text with line breaks."
              rows={20}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewKBPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>}>
      <KBEditor />
    </Suspense>
  );
}
