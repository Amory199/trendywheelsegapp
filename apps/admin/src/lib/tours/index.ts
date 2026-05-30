import type { TourSpec } from "../tour-runner";

// Registry of per-page tour specs. Tour key convention: `admin:<page>`.
// Specs auto-register on import via `./specs`. Missing entries are fine —
// `TourHelpButton` hides itself silently when a key is absent.

const registry: Record<string, TourSpec> = {};

export function getTourSpec(pageKey: string): TourSpec | undefined {
  return registry[pageKey];
}

export function registerTour(pageKey: string, spec: TourSpec): void {
  registry[pageKey] = spec;
}

// Side-effect import: registers all per-page tour specs into the registry.
// Importing this barrel is enough to populate everything.
import "./specs";
