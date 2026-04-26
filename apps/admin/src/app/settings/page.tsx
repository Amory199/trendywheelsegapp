"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface SystemConfig {
  id: string;
  companyName: string;
  companyEmail: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  companyHours: string | null;
  currency: "EGP" | "USD" | "EUR";
  taxRatePct: number | string;
  emailTemplates: Record<string, { subject: string; body: string }>;
  updatedAt: string;
}

interface EmailTemplateMeta {
  id: string;
  name: string;
}

const TEMPLATE_DEFS: EmailTemplateMeta[] = [
  { id: "booking-confirm", name: "Booking Confirmation" },
  { id: "repair-update", name: "Repair Status Update" },
  { id: "otp", name: "OTP Verification" },
];

const TEMPLATE_DEFAULTS: Record<string, { subject: string; body: string }> = {
  "booking-confirm": {
    subject: "Your booking is confirmed — TrendyWheels",
    body: "Hello {{name}},\n\nYour booking #{{bookingId}} has been confirmed.\n\nVehicle: {{vehicleName}}\nPickup: {{startDate}}\nReturn: {{endDate}}\nTotal: {{totalCost}} EGP\n\nThank you for choosing TrendyWheels!\n\nTeam TrendyWheels",
  },
  "repair-update": {
    subject: "Your repair request update — TrendyWheels",
    body: "Hello {{name}},\n\nYour repair request #{{repairId}} has been updated.\n\nStatus: {{status}}\n{{mechanicNote}}\n\nTeam TrendyWheels",
  },
  otp: {
    subject: "Your verification code — TrendyWheels",
    body: "Your TrendyWheels verification code is: {{otp}}\n\nThis code expires in 10 minutes. Do not share it with anyone.",
  },
};

export default function SettingsPage(): JSX.Element {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"company" | "payment" | "templates" | "api">("company");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["system-config"],
    queryFn: () => authedFetch<{ data: SystemConfig }>("/api/admin/system-config"),
  });

  const cfg = data?.data;

  const [draft, setDraft] = useState({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyAddress: "",
    companyHours: "",
    currency: "EGP" as "EGP" | "USD" | "EUR",
    taxRatePct: 14,
    emailTemplates: {} as Record<string, { subject: string; body: string }>,
  });

  useEffect(() => {
    if (!cfg) return;
    const templates = { ...TEMPLATE_DEFAULTS, ...(cfg.emailTemplates ?? {}) };
    setDraft({
      companyName: cfg.companyName ?? "",
      companyEmail: cfg.companyEmail ?? "",
      companyPhone: cfg.companyPhone ?? "",
      companyAddress: cfg.companyAddress ?? "",
      companyHours: cfg.companyHours ?? "",
      currency: cfg.currency,
      taxRatePct: Number(cfg.taxRatePct ?? 14),
      emailTemplates: templates,
    });
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: (patch: Partial<typeof draft>) =>
      authedFetch("/api/admin/system-config", {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["system-config"] }),
  });

  const updateField = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]): void =>
    setDraft((d) => ({ ...d, [key]: value }));

  const updateTemplate = (id: string, field: "subject" | "body", value: string): void =>
    setDraft((d) => ({
      ...d,
      emailTemplates: {
        ...d.emailTemplates,
        [id]: { ...(d.emailTemplates[id] ?? TEMPLATE_DEFAULTS[id]), [field]: value },
      },
    }));

  const saveCompany = (): void => {
    saveMutation.mutate({
      companyName: draft.companyName,
      companyEmail: draft.companyEmail || undefined,
      companyPhone: draft.companyPhone || undefined,
      companyAddress: draft.companyAddress || undefined,
      companyHours: draft.companyHours || undefined,
    } as Partial<typeof draft>);
  };

  const savePayment = (): void =>
    saveMutation.mutate({ currency: draft.currency, taxRatePct: draft.taxRatePct });

  const saveTemplate = (): void =>
    saveMutation.mutate({ emailTemplates: draft.emailTemplates });

  const selected = selectedTemplateId
    ? draft.emailTemplates[selectedTemplateId] ?? TEMPLATE_DEFAULTS[selectedTemplateId]
    : null;

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading…</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">System Configuration</h1>
        {cfg && (
          <span className="text-xs text-gray-400">
            Last updated {new Date(cfg.updatedAt).toLocaleString()}
          </span>
        )}
      </div>

      <div className="flex gap-1 mb-6 border-b">
        {(["company", "payment", "templates", "api"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition capitalize ${
              tab === t
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "api" ? "API Keys" : t === "templates" ? "Email Templates" : t === "payment" ? "Payment" : "Company Info"}
          </button>
        ))}
      </div>

      {tab === "company" && (
        <div className="max-w-xl bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Company Information</h2>
          {(
            [
              ["companyName", "Company Name"],
              ["companyEmail", "Support Email"],
              ["companyPhone", "Phone"],
              ["companyAddress", "Address"],
              ["companyHours", "Operating Hours"],
            ] as Array<[keyof typeof draft, string]>
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-xs font-medium text-gray-500 block mb-1">{label}</span>
              <input
                type="text"
                value={(draft[key] as string) ?? ""}
                onChange={(e) => updateField(key, e.target.value as never)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          ))}
          <SaveButton
            onClick={saveCompany}
            isPending={saveMutation.isPending}
            isSuccess={saveMutation.isSuccess}
          />
        </div>
      )}

      {tab === "payment" && (
        <div className="max-w-xl bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Payment Settings</h2>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">Currency</span>
            <select
              value={draft.currency}
              onChange={(e) => updateField("currency", e.target.value as "EGP" | "USD" | "EUR")}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EGP">EGP — Egyptian Pound</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">Tax Rate (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={draft.taxRatePct}
              onChange={(e) => updateField("taxRatePct", Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
            <strong>Payment Gateway:</strong> Cash-on-pickup is active for v1. Paymob integration is planned for v1.1 post-launch.
          </div>
          <SaveButton
            onClick={savePayment}
            isPending={saveMutation.isPending}
            isSuccess={saveMutation.isSuccess}
          />
        </div>
      )}

      {tab === "templates" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 space-y-2">
            {TEMPLATE_DEFS.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${
                  selectedTemplateId === t.id
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "hover:bg-gray-100"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
          {selected && selectedTemplateId ? (
            <div className="col-span-2 bg-white rounded-xl border p-5 space-y-4">
              <h2 className="font-semibold">
                {TEMPLATE_DEFS.find((t) => t.id === selectedTemplateId)?.name}
              </h2>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 block mb-1">Subject</span>
                <input
                  type="text"
                  value={selected.subject}
                  onChange={(e) => updateTemplate(selectedTemplateId, "subject", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 block mb-1">Body</span>
                <textarea
                  rows={12}
                  value={selected.body}
                  onChange={(e) => updateTemplate(selectedTemplateId, "body", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <p className="text-xs text-gray-400">
                Available variables: {"{{name}}"} {"{{bookingId}}"} {"{{vehicleName}}"} {"{{startDate}}"} {"{{endDate}}"} {"{{totalCost}}"} {"{{otp}}"}
              </p>
              <SaveButton
                onClick={saveTemplate}
                isPending={saveMutation.isPending}
                isSuccess={saveMutation.isSuccess}
                label="Save Template"
              />
            </div>
          ) : (
            <div className="col-span-2 flex items-center justify-center text-gray-400 text-sm">
              Select a template to edit
            </div>
          )}
        </div>
      )}

      {tab === "api" && (
        <div className="max-w-xl bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">API Keys</h2>
          <p className="text-xs text-gray-500">
            Actual keys are stored in the server&apos;s <code>.env</code> on the VPS, not in the database.
            Rotation requires SSH access for security. Surface here is informational only.
          </p>
          {[
            { label: "Twilio (SMS OTP)", env: "TWILIO_AUTH_TOKEN" },
            { label: "SendGrid (Email)", env: "SENDGRID_API_KEY" },
            { label: "Sentry DSN (Mobile)", env: "SENTRY_DSN_MOBILE" },
            { label: "Sentry DSN (Admin)", env: "SENTRY_DSN_ADMIN" },
          ].map((item) => (
            <div key={item.env} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-700">{item.label}</div>
                <div className="text-xs font-mono text-gray-400 mt-0.5">{item.env}</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                Server-side env
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SaveButton({
  onClick,
  isPending,
  isSuccess,
  label = "Save Changes",
}: {
  onClick: () => void;
  isPending: boolean;
  isSuccess: boolean;
  label?: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition disabled:opacity-40"
      >
        {isPending ? "Saving…" : label}
      </button>
      {isSuccess && <span className="text-xs text-green-600">✓ Saved</span>}
    </div>
  );
}
