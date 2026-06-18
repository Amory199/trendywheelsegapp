"use client";

import { useCallback } from "react";

import { runTour } from "./tour-runner";
import { getTourSpec } from "./tours";

// "?" icon button that lives in the right slot of a page's <PageHeader>.
// Looks up the tour by pageKey at click time so admin pages can be migrated
// to <PageHeader> first and tour content added later — missing tour silently
// hides the button.
export function TourHelpButton({ pageKey }: { pageKey: string }): React.JSX.Element | null {
  const spec = getTourSpec(pageKey);

  const onClick = useCallback(() => {
    if (!spec) return;
    void runTour(spec);
  }, [spec]);

  if (!spec) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Show ${pageKey} tour`}
      title="Show a guided tour of this page"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        marginLeft: 8,
        padding: 0,
        borderRadius: "50%",
        border: "1px solid #D1D5DB",
        background: "#FFFFFF",
        color: "#374151",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      ?
    </button>
  );
}
