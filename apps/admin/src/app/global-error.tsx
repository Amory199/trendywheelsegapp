"use client";

import type { JSX } from "react";
import { useEffect } from "react";

// Root error backstop. A chunk that fails DURING render (a stale deploy hitting
// a lazy/dynamic import) surfaces here rather than as a window error, so the
// ChunkReloader's listeners can miss it. Catch it here too: if it looks like a
// stale-deploy chunk failure, reload once (sharing the same cool-down guard as
// chunk-reloader.tsx so the two can't double-reload). Anything else shows a
// friendly retry instead of a blank screen. (INC-050 / INC-054)

const GUARD_KEY = "tw-chunk-reload-at";
const COOLDOWN_MS = 20_000;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  const isChunk = /ChunkLoadError|Loading chunk|loading dynamically imported module/i.test(
    error?.message ?? "",
  );

  useEffect(() => {
    if (!isChunk) return;
    const last = Number(sessionStorage.getItem(GUARD_KEY) ?? "0");
    if (Date.now() - last < COOLDOWN_MS) return;
    sessionStorage.setItem(GUARD_KEY, String(Date.now()));
    window.location.reload();
  }, [isChunk]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#02011F",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>
            {isChunk ? "Updating to the latest version…" : "Something went wrong"}
          </h1>
          <p style={{ opacity: 0.7, fontSize: 14, marginBottom: 20 }}>
            {isChunk
              ? "A new version was just deployed. Reloading…"
              : "Please try again. If it keeps happening, refresh the page."}
          </p>
          <button
            onClick={() => (isChunk ? window.location.reload() : reset())}
            style={{
              background: "#FF0065",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
