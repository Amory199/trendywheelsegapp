"use client";

import { useEffect } from "react";

// Stale-deploy self-heal (INC-050 / INC-054).
//
// When the admin is redeployed, Next.js emits new chunk hashes. A browser tab
// still running the OLD build then requests a chunk hash that no longer exists
// on the server → "ChunkLoadError: Loading chunk N failed" → a blank, crashed
// screen. Rather than strand the user, we reload once to pull the fresh HTML
// (which references the new chunks). A short sessionStorage cool-down prevents a
// reload loop if the failure is genuinely persistent rather than a stale deploy.

const GUARD_KEY = "tw-chunk-reload-at";
const COOLDOWN_MS = 20_000;

function isChunkError(message: string): boolean {
  return /ChunkLoadError|Loading chunk [^\s]+ failed|Loading CSS chunk|error loading dynamically imported module/i.test(
    message,
  );
}

function reloadOnce(message: string): void {
  if (!isChunkError(message)) return;
  const last = Number(sessionStorage.getItem(GUARD_KEY) ?? "0");
  if (Date.now() - last < COOLDOWN_MS) return; // already tried — don't loop
  sessionStorage.setItem(GUARD_KEY, String(Date.now()));
  window.location.reload();
}

export function ChunkReloader(): null {
  useEffect(() => {
    const onError = (e: ErrorEvent): void =>
      reloadOnce(e.message || String((e.error as { message?: string })?.message ?? ""));
    const onRejection = (e: PromiseRejectionEvent): void =>
      reloadOnce(String((e.reason as { message?: string })?.message ?? e.reason ?? ""));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
