// TrendyWheels minimal service worker.
// Just enough to satisfy PWA install criteria + pass through every request
// to the network. Future: layer in offline caching when we have a strategy.
//
// Cache version — bump to invalidate the SW after big infrastructure changes.
const VERSION = "v1";

self.addEventListener("install", (event) => {
  // Take over from any old SW on the next page load
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through — let the browser handle it normally.
  // We intentionally avoid caching API responses or Next.js chunks to
  // prevent the stale-chunk-after-deploy issue we already fight.
  return;
});

// Listen for a SKIP_WAITING message from the client so we can force-update
// the SW without waiting for all tabs to close.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
