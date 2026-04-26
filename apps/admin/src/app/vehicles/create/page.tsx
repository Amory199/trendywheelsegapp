"use client";

import type { FuelType, Transmission, VehicleStatus, VehicleType } from "@trendywheels/types";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { api } from "../../../lib/api";

interface VehicleForm {
  name: string;
  type: VehicleType;
  seating: number;
  fuelType: FuelType;
  transmission: Transmission;
  dailyRate: number;
  location: string;
  status: VehicleStatus;
  features: string;
}

const FEATURES_SUGGESTIONS = ["AC", "GPS", "WiFi", "Child Seat", "Bluetooth", "USB Charging", "Sunroof", "Parking Sensors"];

export default function VehicleCreatePage(): JSX.Element {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<VehicleForm>({
    name: "",
    type: "4-seater",
    seating: 4,
    fuelType: "gasoline",
    transmission: "automatic",
    dailyRate: 0,
    location: "",
    status: "available",
    features: "",
  });
  const [images, setImages] = useState<Array<{ file: File; preview: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addImages = (files: FileList): void => {
    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index: number): void => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index]?.preview ?? "");
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveImage = (from: number, to: number): void => {
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      if (item) next.splice(to, 0, item);
      return next;
    });
  };

  const submit = async (): Promise<void> => {
    if (!form.name || !form.location || form.dailyRate <= 0) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const img of images) {
        const { uploadUrl, fileUrl } = await api.getUploadUrl(img.file.type, "vehicles");
        await fetch(uploadUrl, {
          method: "PUT",
          body: img.file,
          headers: { "Content-Type": img.file.type },
        });
        uploadedUrls.push(fileUrl);
      }

      await api.createVehicle({
        name: form.name,
        type: form.type,
        seating: form.seating,
        fuelType: form.fuelType,
        transmission: form.transmission,
        dailyRate: form.dailyRate,
        location: form.location,
        status: form.status,
        images: uploadedUrls,
        features: form.features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
      });

      router.push("/vehicles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          ←
        </button>
        <h1 className="text-2xl font-bold">Add Vehicle</h1>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 block mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Toyota Camry 2023"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as VehicleType }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {(["4-seater", "6-seater", "LED"] as VehicleType[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Seating</label>
              <input
                type="number"
                min={1}
                max={50}
                value={form.seating}
                onChange={(e) => setForm((f) => ({ ...f, seating: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Fuel Type</label>
              <select
                value={form.fuelType}
                onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value as FuelType }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {(["gasoline", "electric", "hybrid"] as FuelType[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Transmission</label>
              <select
                value={form.transmission}
                onChange={(e) => setForm((f) => ({ ...f, transmission: e.target.value as Transmission }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {(["automatic", "manual"] as Transmission[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Daily Rate (EGP) *</label>
              <input
                type="number"
                min={0}
                value={form.dailyRate}
                onChange={(e) => setForm((f) => ({ ...f, dailyRate: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Location *</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Cairo, Zamalek"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as VehicleStatus }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {(["available", "rented", "maintenance", "inactive"] as VehicleStatus[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Features (comma-separated)
            </label>
            <input
              type="text"
              value={form.features}
              onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
              placeholder="AC, GPS, WiFi, Child Seat"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex gap-1 flex-wrap mt-2">
              {FEATURES_SUGGESTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    const current = form.features.split(",").map((s) => s.trim()).filter(Boolean);
                    if (!current.includes(f)) {
                      setForm((prev) => ({
                        ...prev,
                        features: [...current, f].join(", "),
                      }));
                    }
                  }}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-primary-100 hover:text-primary-600 text-gray-600 rounded text-xs transition"
                >
                  + {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Photos</h2>
          <div className="flex gap-3 flex-wrap">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt={`vehicle ${i + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition flex items-center justify-center gap-1">
                  {i > 0 && (
                    <button
                      onClick={() => moveImage(i, i - 1)}
                      className="w-6 h-6 bg-white rounded-full text-xs flex items-center justify-center"
                    >
                      ←
                    </button>
                  )}
                  <button
                    onClick={() => removeImage(i)}
                    className="w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                  {i < images.length - 1 && (
                    <button
                      onClick={() => moveImage(i, i + 1)}
                      className="w-6 h-6 bg-white rounded-full text-xs flex items-center justify-center"
                    >
                      →
                    </button>
                  )}
                </div>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 bg-primary-500 text-white text-xs px-1 rounded">
                    Cover
                  </span>
                )}
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition text-xs gap-1"
            >
              <span className="text-2xl">+</span>
              <span>Add photo</span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addImages(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="text-xs text-gray-400">First image is used as the cover. Use arrows to reorder.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={submit}
            disabled={loading}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Vehicle"}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium rounded-md transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
