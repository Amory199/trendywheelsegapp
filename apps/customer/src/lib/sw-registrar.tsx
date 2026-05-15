"use client";

import { useEffect } from "react";

// Registers /sw.js once on first client-side mount. The SW itself is a
// minimal pass-through (apps/customer/public/sw.js) — its purpose is to
// satisfy PWA install criteria and let Chrome/Safari surface the
// 'Add to Home Screen' prompt. Future: layer in offline caching.
export function ServiceWorkerRegistrar(): null {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Silent: registration failure shouldn't break the app.
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
