"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useEffect, useState } from "react";

import { authedFetch } from "../../lib/fetcher";

interface Hours {
  dayOfWeek: number;
  openHHMM: string;
  closeHHMM: string;
  locationId: string | null;
  active: boolean;
}
interface Holiday {
  id: string;
  date: string;
  name: string;
  closed: boolean;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BusinessPage(): JSX.Element {
  const qc = useQueryClient();
  const hQ = useQuery<{ data: Hours[] }>({
    queryKey: ["business-hours"],
    queryFn: () => authedFetch("/api/admin/business-hours"),
  });
  const dQ = useQuery<{ data: Holiday[] }>({
    queryKey: ["holidays"],
    queryFn: () => authedFetch("/api/admin/holidays"),
  });

  const [hoursDraft, setHoursDraft] = useState<Hours[]>([]);
  useEffect(() => {
    if (hQ.data) {
      const map = new Map(hQ.data.data.map((h) => [h.dayOfWeek, h]));
      setHoursDraft(
        Array.from(
          { length: 7 },
          (_, i) =>
            map.get(i) ?? {
              dayOfWeek: i,
              openHHMM: "08:00",
              closeHHMM: "22:00",
              locationId: null,
              active: true,
            },
        ),
      );
    }
  }, [hQ.data]);

  const saveHours = useMutation({
    mutationFn: () =>
      authedFetch("/api/admin/business-hours", { method: "PUT", body: JSON.stringify(hoursDraft) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business-hours"] }),
  });

  const [hDraft, setHDraft] = useState({ date: "", name: "" });
  const addHoliday = useMutation({
    mutationFn: () =>
      authedFetch("/api/admin/holidays", {
        method: "POST",
        body: JSON.stringify({ date: hDraft.date, name: hDraft.name, closed: true }),
      }),
    onSuccess: () => {
      setHDraft({ date: "", name: "" });
      void qc.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
  const remHoliday = useMutation({
    mutationFn: (id: string) => authedFetch(`/api/admin/holidays/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["holidays"] }),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.brand.trendyPink,
            letterSpacing: "0.12em",
          }}
        >
          BUSINESS CONFIG
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
            margin: "4px 0 0",
            textTransform: "uppercase",
          }}
        >
          Hours & holidays<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
      </div>

      <section>
        <h2 style={sec}>Operating hours</h2>
        <div
          style={{
            background: "#fff",
            border: "1px solid #ECECF1",
            borderRadius: 14,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {hoursDraft.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{ width: 50, fontSize: 13, fontWeight: 700, color: colors.brand.trustWorth }}
              >
                {DAY_LABELS[h.dayOfWeek]}
              </span>
              <input
                type="time"
                value={h.openHHMM}
                onChange={(e) =>
                  setHoursDraft((s) =>
                    s.map((x, j) => (j === i ? { ...x, openHHMM: e.target.value } : x)),
                  )
                }
                style={inp}
              />
              <span style={{ color: "#9E9DAE" }}>→</span>
              <input
                type="time"
                value={h.closeHHMM}
                onChange={(e) =>
                  setHoursDraft((s) =>
                    s.map((x, j) => (j === i ? { ...x, closeHHMM: e.target.value } : x)),
                  )
                }
                style={inp}
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "#6B6A85",
                }}
              >
                <input
                  type="checkbox"
                  checked={h.active}
                  onChange={(e) =>
                    setHoursDraft((s) =>
                      s.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)),
                    )
                  }
                />
                Open
              </label>
            </div>
          ))}
          <button
            onClick={() => saveHours.mutate()}
            disabled={saveHours.isPending}
            style={primaryBtn}
          >
            {saveHours.isPending ? "Saving…" : "Save hours"}
          </button>
        </div>
      </section>

      <section>
        <h2 style={sec}>Holidays / blackout dates</h2>
        <div
          style={{
            background: "#fff",
            border: "1px solid #ECECF1",
            borderRadius: 14,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="date"
              value={hDraft.date}
              onChange={(e) => setHDraft({ ...hDraft, date: e.target.value })}
              style={inp}
            />
            <input
              value={hDraft.name}
              onChange={(e) => setHDraft({ ...hDraft, name: e.target.value })}
              placeholder="Eid al-Fitr, etc."
              style={{ ...inp, flex: 1 }}
            />
            <button
              onClick={() => addHoliday.mutate()}
              disabled={!hDraft.date || !hDraft.name}
              style={primaryBtn}
            >
              Add
            </button>
          </div>
          {(dQ.data?.data ?? []).map((d) => (
            <div
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                background: "#F7F7FB",
                borderRadius: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: colors.brand.friendlyBlue,
                  minWidth: 100,
                }}
              >
                {new Date(d.date).toLocaleDateString()}
              </span>
              <span style={{ flex: 1, fontSize: 13 }}>{d.name}</span>
              <button
                onClick={() => remHoliday.mutate(d.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.brand.ultraRed,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #ECECF1",
  borderRadius: 8,
  fontSize: 13,
  background: "#F7F7FB",
  fontFamily: "inherit",
};
const primaryBtn: React.CSSProperties = {
  padding: "10px 22px",
  border: "none",
  borderRadius: 10,
  background: colors.brand.friendlyBlue,
  color: "#fff",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  alignSelf: "flex-start",
};
const sec: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#6B6A85",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 12,
};
