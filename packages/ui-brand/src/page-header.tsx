import * as React from "react";

// Shared page header — every admin (and eventually customer/support/inventory)
// page sits under one of these. The right slot is freeform so callers compose
// whatever combination of primary action, secondary action, and tour-launch
// button they need. Helpful when the design wants e.g. [search] [filter] [+]
// inline with the title rather than below.
//
// Intentionally lean: no router knowledge, no fetcher, no auth. Plain props.

const FRIENDLY_BLUE = "#2B0FF8";

export interface PageHeaderProps {
  title: string;
  subtitle?: string | React.ReactNode;
  breadcrumb?: React.ReactNode;
  primaryAction?: React.ReactNode;
  rightSlot?: React.ReactNode;
  helpButton?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  primaryAction,
  rightSlot,
  helpButton,
}: PageHeaderProps): React.JSX.Element {
  return (
    <header
      className="tw-page-header"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "20px 32px 16px",
        borderBottom: "1px solid #E5E7EB",
        background: "#FFFFFF",
      }}
    >
      {breadcrumb ? (
        <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.4 }}>{breadcrumb}</div>
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.2,
                color: "#111827",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h1>
            {helpButton}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.4 }}>{subtitle}</div>
          ) : null}
        </div>
        {(primaryAction || rightSlot) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {rightSlot}
            {primaryAction}
          </div>
        )}
      </div>
    </header>
  );
}

// Reusable accent if a consumer wants to colour-key page actions. Exported
// because admin pages frequently want a brand-coloured primary button.
PageHeader.accentColor = FRIENDLY_BLUE;
