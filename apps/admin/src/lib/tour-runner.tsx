"use client";

import { driver, type Config, type DriveStep } from "driver.js";
import { useEffect, useRef } from "react";

import { useTour } from "../hooks/use-tour";

import "driver.js/dist/driver.css";

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
    const d = createDriver(spec, () => {
      void markSeen();
    });
    // Slight delay so anchored elements are mounted + layouted.
    const t = window.setTimeout(() => d.drive(), 300);
    return () => {
      window.clearTimeout(t);
      d.destroy();
    };
  }, [shouldAutoShow, spec, markSeen]);

  return null;
}

// Imperative tour runner — used by the "?" button to relaunch a tour on demand
// regardless of seen state. Returns a teardown function.
export function runTour(spec: TourSpec, onDone?: () => void): () => void {
  const d = createDriver(spec, onDone);
  d.drive();
  return () => d.destroy();
}

function createDriver(spec: TourSpec, onDone?: () => void) {
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
