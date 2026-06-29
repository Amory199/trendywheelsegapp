"use client";

import { useEffect } from "react";

import { isChunkError, tryChunkReload } from "./chunk-reload-guard";

// Stale-deploy self-heal (INC-050 / INC-054 / INC-057).
//
// When the admin is redeployed, Next.js emits new chunk hashes. A browser tab
// still running the OLD build then requests a chunk hash that no longer exists
// on the server → "ChunkLoadError: Loading chunk N failed" → a blank, crashed
// screen. We reload once to pull the fresh HTML (which references the new
// chunks). The bounded guard (chunk-reload-guard.ts) caps how many times this
// can fire so a genuinely-persistent failure can't loop the tab forever.

export function ChunkReloader(): null {
  useEffect(() => {
    const handle = (message: string): void => {
      if (isChunkError(message)) tryChunkReload(message);
    };
    const onError = (e: ErrorEvent): void =>
      handle(e.message || String((e.error as { message?: string })?.message ?? ""));
    const onRejection = (e: PromiseRejectionEvent): void =>
      handle(String((e.reason as { message?: string })?.message ?? e.reason ?? ""));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
