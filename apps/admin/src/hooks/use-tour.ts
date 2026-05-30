"use client";

import { useCallback } from "react";

import { usePreferences } from "./use-preferences";

interface UseTourResult {
  /** True the first time a user lands on a page (no `false` in preferences yet). */
  shouldAutoShow: boolean;
  /** Tooltips render iff this is true (mirrors `preferences.ui.tooltips`). */
  tooltipsEnabled: boolean;
  /** Persist that the user finished or dismissed the tour. */
  markSeen: () => Promise<void>;
  /** Force-reset so the tour auto-shows again on next visit. */
  markUnseen: () => Promise<void>;
}

// `useTour(pageKey)` — tour state for a single page. Tour key convention:
// `<app>:<page>` (e.g. `admin:dashboard`). Same registry across customer web
// and mobile down the line.
export function useTour(pageKey: string): UseTourResult {
  const { preferences, update } = usePreferences();
  const seen = preferences?.ui?.tours?.[pageKey] === false;
  const everSet = preferences?.ui?.tours?.[pageKey] !== undefined;
  const tooltipsEnabled = preferences?.ui?.tooltips !== "off";

  const markSeen = useCallback(async () => {
    await update({ ui: { tours: { [pageKey]: false } } });
  }, [pageKey, update]);

  const markUnseen = useCallback(async () => {
    await update({ ui: { tours: { [pageKey]: true } } });
  }, [pageKey, update]);

  return {
    // Auto-show iff the user has never been marked seen for this page.
    shouldAutoShow: !everSet || !seen,
    tooltipsEnabled,
    markSeen,
    markUnseen,
  };
}
