import * as React from "react";

// Tiny (i) icon with a hover/focus tooltip. Self-contained — no Radix, no
// portals, no positioning library. Trade-off: tooltips near the right/bottom
// edge of a container can clip; pages that hit this case pass `placement`.
//
// Accessibility: button is focusable, opens on focus + hover, closes on
// blur/leave/Escape, aria-describedby links the content. Title attribute
// kept as a graceful fallback for screen readers that don't follow ARIA.
//
// Suppression: callers pass `hidden` derived from user preferences
// (`preferences.ui.tooltips === "off"`). The component itself doesn't
// touch storage so it stays usable outside the admin app.

export interface InfoTooltipProps {
  content: React.ReactNode;
  hidden?: boolean;
  placement?: "top" | "bottom" | "left" | "right";
  /** Override the (i) icon — for example to use a (?) for "more help". */
  icon?: React.ReactNode;
  /** Label read out by screen readers when the icon has no associated text. */
  label?: string;
}

const DEFAULT_LABEL = "More info";

export function InfoTooltip({
  content,
  hidden,
  placement = "top",
  icon,
  label = DEFAULT_LABEL,
}: InfoTooltipProps): React.JSX.Element | null {
  const [open, setOpen] = React.useState(false);
  const tipId = React.useId();

  if (hidden) return null;

  const positionStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 50,
    maxWidth: 280,
    padding: "8px 10px",
    borderRadius: 6,
    background: "#111827",
    color: "#F9FAFB",
    fontSize: 12,
    lineHeight: 1.4,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    pointerEvents: "none",
    whiteSpace: "normal",
    ...(placement === "top" && {
      bottom: "calc(100% + 6px)",
      left: "50%",
      transform: "translateX(-50%)",
    }),
    ...(placement === "bottom" && {
      top: "calc(100% + 6px)",
      left: "50%",
      transform: "translateX(-50%)",
    }),
    ...(placement === "left" && {
      right: "calc(100% + 6px)",
      top: "50%",
      transform: "translateY(-50%)",
    }),
    ...(placement === "right" && {
      left: "calc(100% + 6px)",
      top: "50%",
      transform: "translateY(-50%)",
    }),
  };

  return (
    <span style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tipId : undefined}
        title={typeof content === "string" ? content : undefined}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          padding: 0,
          marginLeft: 4,
          borderRadius: "50%",
          border: "1px solid #9CA3AF",
          background: "transparent",
          color: "#6B7280",
          fontSize: 11,
          lineHeight: 1,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          cursor: "help",
        }}
      >
        {icon ?? "i"}
      </button>
      {open ? (
        <span id={tipId} role="tooltip" style={positionStyle}>
          {content}
        </span>
      ) : null}
    </span>
  );
}
