"use client";

import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "next/navigation";
import * as React from "react";

import { ACCESS_KEY, readToken } from "./api";

// ⌘K command palette behind the top-bar search box. Debounced single
// round-trip to /api/admin/search, grouped results, full keyboard support
// (↑/↓ to move, Enter to open, Esc to close).

interface SearchUser {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  accountType: string;
}
interface SearchVehicle {
  id: string;
  name: string;
  status: string;
  category: string;
}
interface SearchBooking {
  id: string;
  status: string;
  startDate: string;
  user: { name: string | null };
  vehicle: { name: string };
}
interface SearchResults {
  users: SearchUser[];
  vehicles: SearchVehicle[];
  bookings: SearchBooking[];
}

interface FlatRow {
  kind: "user" | "vehicle" | "booking";
  id: string;
  title: string;
  sub: string;
  href: string;
}

const EMPTY: SearchResults = { users: [], vehicles: [], bookings: [] };

function flatten(r: SearchResults): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const u of r.users) {
    rows.push({
      kind: "user",
      id: u.id,
      title: u.name ?? u.phone,
      sub: `${u.accountType} · ${u.phone}${u.email ? ` · ${u.email}` : ""}`,
      href: u.accountType === "customer" ? `/customers/${u.id}` : "/users",
    });
  }
  for (const v of r.vehicles) {
    rows.push({
      kind: "vehicle",
      id: v.id,
      title: v.name,
      sub: `${v.category} · ${v.status}`,
      href: `/vehicles/${v.id}`,
    });
  }
  for (const b of r.bookings) {
    rows.push({
      kind: "booking",
      id: b.id,
      title: `${b.user.name ?? "Customer"} → ${b.vehicle.name}`,
      sub: `${b.status} · ${new Date(b.startDate).toLocaleDateString()}`,
      href: "/bookings",
    });
  }
  return rows;
}

const KIND_META: Record<FlatRow["kind"], { label: string; tint: string }> = {
  user: { label: "User", tint: colors.brand.friendlyBlue },
  vehicle: { label: "Vehicle", tint: "#0891B2" },
  booking: { label: "Booking", tint: colors.brand.trendyPink },
};

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.JSX.Element | null {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults>(EMPTY);
  const [loading, setLoading] = React.useState(false);
  const [cursor, setCursor] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const rows = React.useMemo(() => flatten(results), [results]);

  // Reset + focus on open
  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults(EMPTY);
    setCursor(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  // Debounced fetch
  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      fetch(`${baseUrl}/api/admin/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}` },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((body: { data: SearchResults }) => {
          setResults(body.data);
          setCursor(0);
        })
        .catch(() => setResults(EMPTY))
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(t);
  }, [query, open]);

  const go = React.useCallback(
    (row: FlatRow | undefined): void => {
      if (!row) return;
      onClose();
      router.push(row.href);
    },
    [onClose, router],
  );

  // Keyboard: arrows + enter + escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, Math.max(rows.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        go(rows[cursor]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, rows, cursor, go, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4000,
        background: "rgba(2,1,31,0.45)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "14vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tw-page-enter"
        style={{
          width: "min(620px, calc(100vw - 32px))",
          borderRadius: 16,
          background: "#fff",
          boxShadow: "0 32px 64px -16px rgba(2,1,31,0.4)",
          overflow: "hidden",
          border: "1px solid #E8E8EE",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
            borderBottom: "1px solid #EEEEF3",
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B6A85"
            strokeWidth="1.8"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.5-4.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vehicles, users, bookings…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 15,
              color: "#1A1933",
              background: "transparent",
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 5,
              background: "#F4F4F7",
              border: "1px solid #E8E8EE",
              color: "#6B6A85",
              fontFamily: "ui-monospace,monospace",
            }}
          >
            Esc
          </kbd>
        </div>

        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {query.trim().length < 2 ? (
            <Hint text="Type at least 2 characters — names, phones, emails, vehicles…" />
          ) : loading && rows.length === 0 ? (
            <Hint text="Searching…" />
          ) : rows.length === 0 ? (
            <Hint text={`No matches for “${query.trim()}”`} />
          ) : (
            rows.map((row, i) => {
              const meta = KIND_META[row.kind];
              const active = i === cursor;
              return (
                <button
                  key={`${row.kind}-${row.id}`}
                  onClick={() => go(row)}
                  onMouseEnter={() => setCursor(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    textAlign: "left",
                    padding: "11px 18px",
                    border: "none",
                    cursor: "pointer",
                    background: active ? "rgba(43,15,248,0.06)" : "transparent",
                    font: "inherit",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                      color: meta.tint,
                      background: `${meta.tint}14`,
                      padding: "3px 8px",
                      borderRadius: 6,
                      minWidth: 58,
                      textAlign: "center",
                    }}
                  >
                    {meta.label}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#1A1933",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.title}
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: "#6B6A85" }}>
                      {row.sub}
                    </span>
                  </span>
                  {active && (
                    <kbd
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 5,
                        background: "#F4F4F7",
                        border: "1px solid #E8E8EE",
                        color: "#6B6A85",
                        fontFamily: "ui-monospace,monospace",
                      }}
                    >
                      ↵
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Hint({ text }: { text: string }): React.JSX.Element {
  return (
    <div style={{ padding: "28px 18px", textAlign: "center", fontSize: 13, color: "#6B6A85" }}>
      {text}
    </div>
  );
}
