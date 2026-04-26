"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Vehicle } from "@trendywheels/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ACCESS_KEY, api, baseUrl, readToken } from "../../../../lib/api";

interface ServerConditionReport {
  id: string;
  vehicleId: string;
  notes: string;
  photos: string[];
  severity: "minor" | "moderate" | "severe";
  createdAt: string;
  reporter: { id: string; name: string; email: string | null };
}

interface ConditionReport {
  id: string;
  date: string;
  note: string;
  type: "inspection" | "damage" | "service" | "delivery";
  photos: string[];
  addedBy: string;
}

function severityToType(s: ServerConditionReport["severity"]): ConditionReport["type"] {
  return s === "severe" ? "damage" : s === "moderate" ? "service" : "inspection";
}

function typeToSeverity(t: ConditionReport["type"]): ServerConditionReport["severity"] {
  return t === "damage" ? "severe" : t === "service" ? "moderate" : "minor";
}

async function fetchReports(vehicleId: string): Promise<{ data: ServerConditionReport[] }> {
  const res = await fetch(`${baseUrl}/api/inventory/vehicles/${vehicleId}/condition-reports`, {
    headers: { Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}` },
  });
  if (!res.ok) throw new Error("Failed to load condition reports");
  return res.json();
}

async function postReport(
  vehicleId: string,
  body: { notes: string; photos: string[]; severity: ServerConditionReport["severity"] },
): Promise<{ data: ServerConditionReport }> {
  const res = await fetch(`${baseUrl}/api/inventory/vehicles/${vehicleId}/condition-reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to save report");
  return res.json();
}

const TYPE_CONFIG: Record<
  ConditionReport["type"],
  { label: string; icon: string; badge: string }
> = {
  inspection: { label: "Inspection", icon: "🔍", badge: "bg-blue-100 text-blue-700" },
  damage: { label: "Damage", icon: "⚠️", badge: "bg-red-100 text-red-700" },
  service: { label: "Service", icon: "🔧", badge: "bg-yellow-100 text-yellow-700" },
  delivery: { label: "Delivery", icon: "🚗", badge: "bg-green-100 text-green-700" },
};

export default function VehicleConditionPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const reportsQ = useQuery({
    queryKey: ["condition-reports", id],
    queryFn: () => fetchReports(id),
    enabled: Boolean(id),
  });
  const reports: ConditionReport[] = (reportsQ.data?.data ?? []).map((r) => ({
    id: r.id,
    date: r.createdAt,
    note: r.notes,
    type: severityToType(r.severity),
    photos: r.photos,
    addedBy: r.reporter?.name ?? "Agent",
  }));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    note: "",
    type: "inspection" as ConditionReport["type"],
  });
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => api.getVehicle(id),
    enabled: !!id,
  });

  const vehicle = data?.data as Vehicle | undefined;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const { uploadUrl, fileUrl } = await api.getUploadUrl(file.type, "condition");
        await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        urls.push(fileUrl);
      }
      setUploadedPhotos((prev) => [...prev, ...urls]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addMutation = useMutation({
    mutationFn: () =>
      postReport(id, {
        notes: form.note,
        photos: uploadedPhotos,
        severity: typeToSeverity(form.type),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["condition-reports", id] });
      setForm({ note: "", type: "inspection" });
      setUploadedPhotos([]);
      setShowForm(false);
    },
  });

  const addReport = (): void => {
    if (!form.note.trim()) return;
    addMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">Loading vehicle…</div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Vehicle not found.</p>
        <Link href="/availability" className="text-emerald-600 hover:underline mt-2 block">
          ← Back to availability
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 mb-4 block">
        ← Back
      </button>

      {/* Vehicle header */}
      <div className="bg-white rounded-xl border p-5 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{vehicle.name}</h1>
          <div className="flex gap-3 mt-1 text-sm text-gray-500">
            <span className="capitalize">{vehicle.type}</span>
            <span>{vehicle.location}</span>
            <span className="capitalize">{vehicle.status}</span>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition"
        >
          + Add Report
        </button>
      </div>

      {/* Report form */}
      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-6 space-y-4">
          <h2 className="font-semibold">New Condition Report</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ConditionReport["type"] }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.icon} {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Date</label>
              <input
                type="text"
                readOnly
                value={new Date().toLocaleDateString()}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Describe the vehicle condition…"
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Photos</label>
            <div className="flex gap-2 flex-wrap">
              {uploadedPhotos.map((url, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`photo ${i + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => setUploadedPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition disabled:opacity-40"
              >
                {uploading ? "…" : "+"}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={addReport}
              disabled={!form.note.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition disabled:opacity-40"
            >
              Save Report
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

      {/* Timeline */}
      <h2 className="font-semibold text-gray-700 mb-4">Condition History</h2>
      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
          <div className="text-4xl mb-2">📋</div>
          <p>No condition reports yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-emerald-600 hover:underline text-sm"
          >
            Add the first report →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report, index) => {
            const cfg = TYPE_CONFIG[report.type];
            return (
              <div key={report.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-emerald-400 flex items-center justify-center text-sm">
                    {cfg.icon}
                  </div>
                  {index < reports.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 mt-2" />
                  )}
                </div>
                <div className="flex-1 bg-white rounded-xl border p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(report.date).toLocaleString()} · by {report.addedBy}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{report.note}</p>
                  {report.photos.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {report.photos.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt={`photo ${i + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
