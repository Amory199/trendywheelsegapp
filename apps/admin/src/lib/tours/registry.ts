import type { TourSpec } from "../tour-runner";

// Tour registry. Lives in its own module so `specs.ts` can register into it
// without taking a circular dependency on the `./index` barrel (which itself
// triggers the spec side-effect import). The cycle worked in dev but the
// production build minifier reordered the bindings, producing a TDZ error
// during static prerender of pages that mount the GlobalTourMounter.

const registry: Record<string, TourSpec> = {};

export function getTourSpec(pageKey: string): TourSpec | undefined {
  return registry[pageKey];
}

export function registerTour(pageKey: string, spec: TourSpec): void {
  registry[pageKey] = spec;
}
