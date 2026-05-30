"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { TourRunner } from "./tour-runner";
import { getTourSpec } from "./tours";

// Maps the current admin pathname to a tour pageKey + spec from the registry.
// Mounted once in the root layout — auto-launches per page on first visit,
// no-ops everywhere else. Detail routes (e.g. /customers/[id]) inherit the
// list-page tour if a detail-specific spec isn't registered, which is the
// right default — the list tour usually covers the navigation context.
export function GlobalTourMounter(): React.JSX.Element | null {
  const path = usePathname();
  const { pageKey, spec } = useMemo(() => {
    const top = pathFirstSegment(path);
    if (!top) return { pageKey: "admin:dashboard", spec: getTourSpec("admin:dashboard") };
    const key = `admin:${top}`;
    return { pageKey: key, spec: getTourSpec(key) };
  }, [path]);

  if (!spec) return null;
  return <TourRunner pageKey={pageKey} spec={spec} />;
}

function pathFirstSegment(path: string): string | null {
  if (!path || path === "/") return null;
  const parts = path.split("/").filter(Boolean);
  return parts[0] ?? null;
}
