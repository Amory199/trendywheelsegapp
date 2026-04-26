"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FuelType, Transmission, Vehicle, VehicleStatus, VehicleType } from "@trendywheels/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { api } from "../../../lib/api";

const FEATURES_SUGGESTIONS = ["AC", "GPS", "WiFi", "Child Seat", "Bluetooth", "USB Charging", "Sunroof", "Parking Sensors"];

export default function VehicleEditPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-admin", id],
    queryFn: () => api.getVehicle(id),
    enabled: !!id,
  });

  const vehicle = data?.data as Vehicle | undefined;

  const [name, setName] = useState("");
  const [type, setType] = useState<VehicleType>("4-seater");
  const [seating, setSeating] = useState(4);
  const [fuelType, setFuelType] = useState<FuelType>("gasoline");
  const [transmission, setTransmission] = useState<Transmission>("automatic");
  const [dailyRate, setDailyRate] = useState(0);
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<VehicleStatus>("available");
  const [features, setFeatures] = useState("");
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<Array<{ file: File; preview: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setName(vehicle.name);
      setType(vehicle.type);
      setSeating(vehicle.seating);
      setFuelType(vehicle.fuelType);
      setTransmission(vehicle.transmission);
      setDailyRate(vehicle.dailyRate);
      setLocation(vehicle.location);
      setStatus(vehicle.status);
      setFeatures(vehicle.features.join(", "));
      // The API returns images as { url, sortOrder, ... } objects; the update
      // contract expects string URLs, so flatten on load.
      const imgs = (vehicle.images as unknown as Array<string | { url: string }>) ?? [];
      setExistingImages(
        imgs.map((i) => (typeof i === "string" ? i : i.url)).filter(Boolean),
      );
    }
  }, [vehicle]);

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteVehicle(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["vehicles"] });
      router.push("/vehicles");
    },
  });

  const removeExisting = (url: string): void => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  };

  const addImages = (files: FileList): void => {
    const imgs = Array.from(files).map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setNewImages((prev) => [...prev, ...imgs]);
  };

  const submit = async (): Promise<void> => {
    if (!name || !location || dailyRate <= 0) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const img of newImages) {
        const { uploadUrl, fileUrl } = await api.getUploadUrl(img.file.type, "vehicles");
        await fetch(uploadUrl, { method: "PUT", body: img.file, headers: { "Content-Type": img.file.type } });
        uploadedUrls.push(fileUrl);
      }

      await api.updateVehicle(id, {
        name, type, seating, fuelType, transmission, dailyRate, location, status,
        images: [...existingImages, ...uploadedUrls],
        features: features.split(",").map((f) => f.trim()).filter(Boolean),
      });

      void qc.invalidateQueries({ queryKey: ["vehicles"] });
      router.push("/vehicles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update vehicle");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;
  }

  if (!vehicle) {
    return <div className="p-8 text-gray-500">Vehicle not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="text-2xl font-bold flex-1">Edit Vehicle</h1>
        <button
          onClick={() => {
            if (confirm("Delete this vehicle? This cannot be undone.")) deleteMutation.mutate();
          }}
          className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-md transition"
        >
          Delete
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 block mb-1">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as VehicleType)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {(["4-seater", "6-seater", "LED"] as VehicleType[]).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Seating</label>
              <input type="number" min={1} max={50} value={seating} onChange={(e) => setSeating(Number(e.target.value))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Fuel</label>
              <select value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {(["gasoline", "electric", "hybrid"] as FuelType[]).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Transmission</label>
              <select value={transmission} onChange={(e) => setTransmission(e.target.value as Transmission)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {(["automatic", "manual"] as Transmission[]).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Daily Rate (EGP) *</label>
              <input type="number" min={0} value={dailyRate} onChange={(e) => setDailyRate(Number(e.target.value))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Location *</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as VehicleStatus)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {(["available", "rented", "maintenance", "inactive"] as VehicleStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Features (comma-separated)</label>
            <input type="text" value={features} onChange={(e) => setFeatures(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <div className="flex gap-1 flex-wrap mt-2">
              {FEATURES_SUGGESTIONS.map((f) => (
                <button key={f} type="button" onClick={() => {
                  const current = features.split(",").map((s) => s.trim()).filter(Boolean);
                  if (!current.includes(f)) setFeatures([...current, f].join(", "));
                }} className="px-2 py-0.5 bg-gray-100 hover:bg-primary-100 hover:text-primary-600 text-gray-600 rounded text-xs transition">
                  + {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Photos</h2>
          <div className="flex gap-3 flex-wrap">
            {existingImages.map((url, i) => (
              <div key={url} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`photo ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border" />
                <button onClick={() => removeExisting(url)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">×</button>
                {i === 0 && <span className="absolute bottom-1 left-1 bg-primary-500 text-white text-xs px-1 rounded">Cover</span>}
              </div>
            ))}
            {newImages.map((img, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt={`new ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border border-primary-300" />
                <button onClick={() => setNewImages((p) => p.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">×</button>
                <span className="absolute bottom-1 left-1 bg-primary-400 text-white text-xs px-1 rounded">New</span>
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition text-xs gap-1">
              <span className="text-2xl">+</span>
              <span>Add photo</span>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ""; }} />
        </div>

        <div className="flex gap-3">
          <button onClick={submit} disabled={loading} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition disabled:opacity-50">
            {loading ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={() => router.back()} className="px-6 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium rounded-md transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
