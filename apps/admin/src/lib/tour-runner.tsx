"use client";

import type { Config, DriveStep } from "driver.js";
// Stylesheet is tiny and has no JS cost (Next extracts it to a CSS file); only
// the driver.js *JS* is heavy, so just that is lazy-loaded in createDriver().
import "driver.js/dist/driver.css";
import { useEffect, useRef } from "react";

import { useTour } from "../hooks/use-tour";

// Tour spec — what each page hands to the runner. Steps target real DOM via
// CSS selector (`[data-tour="..."]`) so missing anchors silently skip rather
// than crash. The first step usually has no `element` — it's the welcome modal.
export type TourSpec = {
  steps: DriveStep[];
  /** Optional driver.js overrides — most pages use the defaults. */
  config?: Partial<Config>;
};

// Mounted on every page that has a tour. Auto-launches on first visit, no-ops
// on subsequent visits. The "?" button (TourHelpButton) calls the imperative
// `runTour(pageKey)` API instead.
export function TourRunner({ pageKey, spec }: { pageKey: string; spec: TourSpec }): null {
  const { shouldAutoShow, markSeen } = useTour(pageKey);
  const launched = useRef(false);

  useEffect(() => {
    if (!shouldAutoShow || launched.current) return;
    launched.current = true;
    let cancelled = false;
    let driverInstance: DriverInstance | null = null;
    let timer: number | null = null;

    void createDriver(spec, () => {
      void markSeen();
    }).then((d) => {
      if (cancelled) {
        // Effect was torn down before driver.js finished loading — drop it.
        d.destroy();
        return;
      }
      driverInstance = d;
      // Slight delay so anchored elements are mounted + layouted.
      timer = window.setTimeout(() => d.drive(), 300);
    });

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      driverInstance?.destroy();
    };
  }, [shouldAutoShow, spec, markSeen]);

  return null;
}

// Imperative tour runner — used by the "?" button to relaunch a tour on demand
// regardless of seen state. driver.js is loaded lazily, so this is async; it
// resolves to a teardown function once the tour is running.
export async function runTour(spec: TourSpec, onDone?: () => void): Promise<() => void> {
  const d = await createDriver(spec, onDone);
  d.drive();
  return () => d.destroy();
}

// driver.js exposes its instance type via the return of `driver()`. We infer it
// from the dynamically-imported module to avoid a static runtime import.
type DriverInstance = Awaited<ReturnType<typeof createDriver>>;

async function createDriver(spec: TourSpec, onDone?: () => void) {
  // Lazily pull in the driver.js JS only when a tour actually runs (the heavy
  // part). The stylesheet is imported statically at module top — it has no JS
  // cost, so keeping the JS out of the critical bundle is the win.
  const { driver } = await import("driver.js");
  return driver({
    showProgress: true,
    showButtons: ["next", "previous", "close"],
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Got it ✨",
    progressText: "{{current}} / {{total}}",
    allowClose: true,
    overlayOpacity: 0.6,
    smoothScroll: true,
    // Hooks our brand styling — see `/* Tour popovers */` block in globals.css.
    popoverClass: "tw-tour",
    onDestroyed: () => {
      onDone?.();
    },
    ...spec.config,
    steps: spec.steps,
  });
}
