"use client";

import { useMutation } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authedFetch } from "../../../lib/fetcher";

const CONDITIONS = ["excellent", "good", "fair", "poor"] as const;
type Condition = (typeof CONDITIONS)[number];

interface PresignResp {
  uploadUrl: string;
  fileUrl: string;
}

export default function TradeInPage(): JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [condition, setCondition] = useState<Condition>("good");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      authedFetch<{ data: { id: string } }>("/api/trade-in", {
        method: "POST",
        body: JSON.stringify({ brand, model, year, condition, notes, photos }),
      }),
    onSuccess: () => router.push("/profile?tab=trade-ins"),
  });

  const onPickPhotos = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const f of files.slice(0, 6 - photos.length)) {
        const presign = await authedFetch<PresignResp>("/api/storage/presign", {
          method: "POST",
          body: JSON.stringify({ mimeType: f.type, prefix: "trade-ins" }),
        });
        await fetch(presign.uploadUrl, {
          method: "PUT",
          body: f,
          headers: { "Content-Type": f.type },
        });
        uploaded.push(presign.fileUrl);
      }
      setPhotos((p) => [...p, ...uploaded]);
    } finally {
      setUploading(false);
    }
  };

  const canProceed1 = brand.trim() && model.trim() && year !== "";
  const canProceed2 = photos.length >= 1;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div
        style={{
          marginBottom: 18,
          fontSize: 11,
          letterSpacing: 2,
          textTransform: "uppercase",
          opacity: 0.6,
        }}
      >
        Trade-in · Step {step} of 3
      </div>
      <h1 style={{ fontFamily: "Anton, sans-serif", fontSize: 44, margin: 0, lineHeight: 1 }}>
        {step === 1 ? "Tell us about your cart" : step === 2 ? "Add photos" : "Review + submit"}
      </h1>

      {/* Step 1 */}
      {step === 1 ? (
        <div style={{ marginTop: 28, display: "grid", gap: 14 }}>
          <Field
            label="Brand"
            value={brand}
            onChange={setBrand}
            placeholder="Club Car / E-Z-GO / Yamaha …"
          />
          <Field label="Model" value={model} onChange={setModel} placeholder="Onward 4P, RXV …" />
          <Field
            label="Year"
            value={year === "" ? "" : String(year)}
            onChange={(v) => setYear(v ? Number(v) : "")}
            placeholder="2022"
          />
          <div>
            <Label>Condition</Label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {CONDITIONS.map((c) => {
                const active = condition === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCondition(c)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 999,
                      border: active ? "none" : "1px solid rgba(2,1,31,0.12)",
                      background: active ? colors.brand.trustWorth : "#fff",
                      color: active ? "#fff" : colors.brand.trustWorth,
                      fontWeight: 600,
                      textTransform: "capitalize",
                      cursor: "pointer",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any modifications, recent service, known issues…"
              style={inputStyle}
            />
          </div>
          <Footer onNext={() => setStep(2)} disabled={!canProceed1} label="Next" />
        </div>
      ) : null}

      {/* Step 2 */}
      {step === 2 ? (
        <div style={{ marginTop: 28 }}>
          <Label>Upload up to 6 photos</Label>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 10,
            }}
          >
            {photos.map((p, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 12,
                  backgroundImage: `url("${p}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            ))}
            {photos.length < 6 ? (
              <label
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 12,
                  border: "2px dashed rgba(2,1,31,0.15)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  background: "#fff",
                  fontSize: 28,
                  color: "rgba(2,1,31,0.4)",
                }}
              >
                +
                <input type="file" accept="image/*" multiple hidden onChange={onPickPhotos} />
              </label>
            ) : null}
          </div>
          {uploading ? (
            <div style={{ marginTop: 12, fontSize: 13, opacity: 0.6 }}>Uploading…</div>
          ) : null}
          <Footer
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            disabled={!canProceed2}
            label="Next"
          />
        </div>
      ) : null}

      {/* Step 3 */}
      {step === 3 ? (
        <div style={{ marginTop: 28 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 20,
              border: "1px solid rgba(2,1,31,0.06)",
              fontSize: 14,
              display: "grid",
              gridTemplateColumns: "max-content 1fr",
              gap: "10px 18px",
            }}
          >
            <div style={{ opacity: 0.55 }}>Brand</div>
            <div>{brand}</div>
            <div style={{ opacity: 0.55 }}>Model</div>
            <div>{model}</div>
            <div style={{ opacity: 0.55 }}>Year</div>
            <div>{year}</div>
            <div style={{ opacity: 0.55 }}>Condition</div>
            <div style={{ textTransform: "capitalize" }}>{condition}</div>
            {notes ? (
              <>
                <div style={{ opacity: 0.55 }}>Notes</div>
                <div>{notes}</div>
              </>
            ) : null}
            <div style={{ opacity: 0.55 }}>Photos</div>
            <div>{photos.length} attached</div>
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 13,
              opacity: 0.7,
              padding: 14,
              background: "rgba(0,199,234,0.08)",
              borderRadius: 12,
            }}
          >
            We&apos;ll get back to you with a quote within 24 hours. Quotes are valid for 7 days.
          </div>
          <Footer
            onBack={() => setStep(2)}
            onNext={() => submit.mutate()}
            disabled={submit.isPending}
            label={submit.isPending ? "Submitting…" : "Submit trade-in"}
          />
        </div>
      ) : null}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(2,1,31,0.12)",
  background: "#fff",
  fontSize: 15,
  fontFamily: "inherit",
  color: colors.brand.trustWorth,
  outline: "none",
};

function Label({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, letterSpacing: 0.4 }}>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}): JSX.Element {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, marginTop: 6 }}
      />
    </div>
  );
}

function Footer({
  onBack,
  onNext,
  disabled,
  label,
}: {
  onBack?: () => void;
  onNext: () => void;
  disabled?: boolean;
  label: string;
}): JSX.Element {
  return (
    <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "flex-end" }}>
      {onBack ? (
        <button
          onClick={onBack}
          style={{
            padding: "12px 22px",
            borderRadius: 12,
            border: "1px solid rgba(2,1,31,0.12)",
            background: "#fff",
            color: colors.brand.trustWorth,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Back
        </button>
      ) : null}
      <button
        onClick={onNext}
        disabled={disabled}
        className="tw-press"
        style={{
          padding: "12px 26px",
          borderRadius: 12,
          border: "none",
          background: disabled ? "rgba(2,1,31,0.2)" : colors.brand.friendlyBlue,
          color: "#fff",
          fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {label}
      </button>
    </div>
  );
}
