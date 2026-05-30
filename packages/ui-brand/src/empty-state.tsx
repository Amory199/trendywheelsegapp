import * as React from "react";

// Empty-state prompt — what a list/table page shows when it has zero rows.
// A blank table tells the user nothing; a prompt tells them what to do next.
// Pattern: icon + headline + one-line guidance + a single primary CTA.
//
// Intentionally plain: no router knowledge, no fetcher. Callers pass the CTA
// as a React node so they can wire it to whatever Link/Button/onClick they
// already have on the page.

const FRIENDLY_BLUE = "#2B0FF8";

export interface EmptyStateProps {
  // Big glyph at the top. Pass an emoji string ("🚗") or a small SVG/icon node.
  icon?: React.ReactNode;
  // Headline — what the table would have shown ("No vehicles yet").
  title: string;
  // One sentence telling the user why this is empty and what doing the CTA gets them.
  description?: string | React.ReactNode;
  // Primary call-to-action. Usually a Link to a create page or an onClick button.
  action?: React.ReactNode;
  // Optional second action: "Or import a CSV", "Learn how this works".
  secondaryAction?: React.ReactNode;
  // When `true`, the component renders without its outer card chrome — useful
  // when the caller already wraps it in a panel and just wants the contents.
  flush?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  flush = false,
}: EmptyStateProps): React.JSX.Element {
  const inner = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 12,
        padding: "48px 24px",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {icon ? (
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            background: "#F3F4F6",
            color: FRIENDLY_BLUE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            lineHeight: 1,
          }}
        >
          {icon}
        </div>
      ) : null}
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "#111827",
          margin: 0,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      {description ? (
        <p
          style={{
            fontSize: 14,
            color: "#6B7280",
            lineHeight: 1.5,
            margin: 0,
            maxWidth: 380,
          }}
        >
          {description}
        </p>
      ) : null}
      {(action || secondaryAction) && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );

  if (flush) return inner;

  return (
    <div
      style={{
        border: "1px dashed #D1D5DB",
        borderRadius: 12,
        background: "#FFFFFF",
      }}
    >
      {inner}
    </div>
  );
}

EmptyState.accentColor = FRIENDLY_BLUE;
