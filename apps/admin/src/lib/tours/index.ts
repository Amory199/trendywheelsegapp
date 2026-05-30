import type { TourSpec } from "../tour-runner";

// Registry of per-page tour specs. Tour key convention: `admin:<page>`.
// Tours land here as Phase 5 of the admin reorg track. Missing entries
// are fine — `TourHelpButton` hides itself silently when a key is absent.

const registry: Record<string, TourSpec> = {};

export function getTourSpec(pageKey: string): TourSpec | undefined {
  return registry[pageKey];
}

export function registerTour(pageKey: string, spec: TourSpec): void {
  registry[pageKey] = spec;
}
