// Shared bounded-retry guard for stale-deploy chunk failures (INC-050/054/057).
//
// A redeploy emits new chunk hashes; a tab on the OLD build requests a hash that
// no longer exists → ChunkLoadError. Reloading once pulls the fresh HTML, which
// is the right fix for a transient stale deploy. But a PERSISTENT failure
// (corrupt/missing chunk, an ad-blocker, a service-worker serving stale HTML,
// the server still mid-deploy) re-fires on every fresh load — so an unbounded
// "reload on chunk error" loops the tab forever. This caps auto-reloads to
// MAX within WINDOW; once exhausted we STOP and let the UI show a manual
// "Reload" affordance instead of looping. Both chunk-reloader.tsx (window
// errors) and global-error.tsx (render-phase errors) funnel through here so the
// count is shared and they can't double-count.

const AT_KEY = "tw-chunk-reload-at"; // window start (ms)
const COUNT_KEY = "tw-chunk-reload-count";
const WINDOW_MS = 60_000;
const MAX_RELOADS = 2;

export function isChunkError(message: string): boolean {
  return /ChunkLoadError|Loading chunk [^\s]+ failed|Loading CSS chunk|loading dynamically imported module/i.test(
    message,
  );
}

// Fire-and-forget telemetry BEFORE we navigate away, using sendBeacon/keepalive
// so it isn't cancelled by the reload (the reason chunk errors never reached the
// error log before). Best-effort only — never throws.
function reportChunkError(message: string): void {
  try {
    const body = JSON.stringify({
      source: "admin",
      level: "warn",
      message: "chunk_load_error",
      route: typeof location !== "undefined" ? location.pathname : undefined,
      metadata: { detail: message.slice(0, 300) },
    });
    const url = "/api/client-errors";
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(url, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    }
  } catch {
    /* telemetry must never break recovery */
  }
}

// Attempt a bounded reload. Returns true if it reloaded, false if the cap was
// hit (caller should surface a manual reload button instead of looping).
export function tryChunkReload(message: string): boolean {
  try {
    const now = Date.now();
    const start = Number(sessionStorage.getItem(AT_KEY) ?? "0");
    let count = Number(sessionStorage.getItem(COUNT_KEY) ?? "0");
    if (!start || now - start > WINDOW_MS) {
      // Fresh window — reset the counter.
      count = 0;
      sessionStorage.setItem(AT_KEY, String(now));
    }
    if (count >= MAX_RELOADS) return false; // give up — stop the loop
    reportChunkError(message);
    sessionStorage.setItem(COUNT_KEY, String(count + 1));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}
