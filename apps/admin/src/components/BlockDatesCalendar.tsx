"use client";

import { useState } from "react";
import type { JSX } from "react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Month-grid calendar for one-off blackout dates. Admin taps a date to toggle it
 * blocked (red); past dates are disabled. Value + onChange are YYYY-MM-DD strings.
 * Sits on top of the weekday availability pattern — a date is bookable only if
 * its weekday is allowed AND it isn't blocked here AND it isn't already booked.
 */
export function BlockDatesCalendar({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}): JSX.Element {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const blocked = new Set(value);
  const firstDow = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toggle = (d: number): void => {
    const s = iso(cursor.y, cursor.m, d);
    onChange(blocked.has(s) ? value.filter((x) => x !== s) : [...value, s].sort());
  };
  const prev = (): void =>
    setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  const next = (): void =>
    setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));

  return (
    <div className="border border-gray-200 rounded-lg p-3 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prev}
          className="w-7 h-7 rounded hover:bg-gray-100 text-gray-600"
        >
          ‹
        </button>
        <div className="text-sm font-semibold">
          {MONTHS[cursor.m]} {cursor.y}
        </div>
        <button
          type="button"
          onClick={next}
          className="w-7 h-7 rounded hover:bg-gray-100 text-gray-600"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((d) => (
          <div key={d} className="text-[10px] text-gray-400 font-semibold py-1">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const s = iso(cursor.y, cursor.m, d);
          const isBlocked = blocked.has(s);
          const isPast = s < todayIso;
          return (
            <button
              key={s}
              type="button"
              disabled={isPast}
              onClick={() => toggle(d)}
              className={`h-8 rounded text-sm transition-colors ${
                isPast
                  ? "text-gray-300 cursor-not-allowed"
                  : isBlocked
                    ? "bg-red-500 text-white font-semibold"
                    : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Tap a date to block it (maintenance, holidays, off-platform rentals).{" "}
        {value.length > 0 ? `${value.length} blocked.` : "None blocked."}
      </p>
    </div>
  );
}
