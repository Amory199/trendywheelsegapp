import * as React from "react";

// TrendyWheels brand primitives — DOM/SVG version for admin/support/inventory dashboards.
// Geometric 't' monogram: three rounded quarter-wedge blocks in brand blue,
// with a gradient-to-white fade on the top-right wedge + pink accent dot.

const FRIENDLY_BLUE = "#2B0FF8";
const TRENDY_PINK = "#FF0065";

export function TWMonogram({
  size = 40,
  fadeTo = "#FFFFFF",
}: {
  size?: number;
  fadeTo?: string;
}): React.JSX.Element {
  const gid = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={`${gid}-fade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={FRIENDLY_BLUE} />
          <stop offset="1" stopColor={fadeTo} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${gid}-solid`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={FRIENDLY_BLUE} />
          <stop offset="1" stopColor={FRIENDLY_BLUE} stopOpacity="0.82" />
        </linearGradient>
      </defs>
      {/* base solid wedge (vertical stem with rounded tip) */}
      <path
        d="M26 8 h12 a4 4 0 0 1 4 4 v40 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 v-40 a4 4 0 0 1 4 -4 z"
        fill={`url(#${gid}-solid)`}
      />
      {/* left upper wedge */}
      <path d="M10 16 h20 v12 h-12 a8 8 0 0 1 -8 -8 z" fill={`url(#${gid}-solid)`} opacity="0.92" />
      {/* right upper wedge (fades to white per brief) */}
      <path d="M34 16 h20 a0 0 0 0 1 0 0 v4 a8 8 0 0 1 -8 8 h-12 z" fill={`url(#${gid}-fade)`} />
      {/* accent pink dot */}
      <circle cx="50" cy="50" r="4" fill={TRENDY_PINK} />
    </svg>
  );
}

const FONT_DISPLAY = "Anton, Impact, 'Bebas Neue', system-ui, sans-serif";
const FONT_BODY = "'Source Sans 3', 'Source Sans Pro', 'Myriad Pro', system-ui, sans-serif";

export function TWWordmark({
  size = 22,
  color = FRIENDLY_BLUE,
  stacked = false,
}: {
  size?: number;
  color?: string;
  stacked?: boolean;
}): React.JSX.Element {
  if (stacked) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          lineHeight: 0.92,
          color,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: size,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          TRENDY<span style={{ color: TRENDY_PINK }}>.</span>
        </div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 300,
            fontSize: size * 0.42,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            opacity: 0.7,
            marginTop: size * 0.08,
          }}
        >
          Wheels
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: size * 0.25,
        color,
      }}
    >
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: size,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          lineHeight: 1,
        }}
      >
        Trendy<span style={{ color: TRENDY_PINK }}>.</span>Wheels
      </span>
    </div>
  );
}

export function TWLogoLockup({
  size = 40,
  color = FRIENDLY_BLUE,
}: {
  size?: number;
  color?: string;
}): React.JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.28 }}>
      <TWMonogram size={size} />
      <TWWordmark size={size * 0.62} color={color} />
    </div>
  );
}

// MobileNavDrawer — slide-from-side panel + scrim. Pure CSS, no Shadcn.
// Used by admin/support/inventory shells on small screens to hide the
// 240px sidebar behind a hamburger. Locks body scroll while open, traps
// Escape, and clicking outside closes it.
export function MobileNavDrawer({
  open,
  onClose,
  children,
  side = "left",
  width = 280,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: "left" | "right";
  width?: number;
}): React.JSX.Element | null {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const translateClosed = side === "left" ? -100 : 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        flexDirection: side === "left" ? "row" : "row-reverse",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(2,1,31,0.45)",
          backdropFilter: "blur(2px)",
          animation: "twNavFade 180ms cubic-bezier(.2,.7,.3,1) both",
        }}
      />
      <aside
        style={{
          position: "relative",
          width: `min(${width}px, 86vw)`,
          maxWidth: width,
          height: "100%",
          background: "#FFFFFF",
          boxShadow:
            side === "left" ? "8px 0 32px rgba(2,1,31,0.18)" : "-8px 0 32px rgba(2,1,31,0.18)",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom)",
          animation: `twNavSlide${side === "left" ? "L" : "R"} 220ms cubic-bezier(.2,.7,.3,1) both`,
        }}
      >
        {children}
      </aside>
      <style>{`
        @keyframes twNavFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes twNavSlideL { from { transform: translateX(${translateClosed}%) } to { transform: translateX(0) } }
        @keyframes twNavSlideR { from { transform: translateX(${translateClosed}%) } to { transform: translateX(0) } }
      `}</style>
    </div>
  );
}

// Hamburger icon — 24×24 SVG. Pair with a button that opens MobileNavDrawer.
export function TWHamburgerIcon({
  size = 22,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export function TWCloseIcon({
  size = 22,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
