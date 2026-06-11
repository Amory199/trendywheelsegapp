"use client";

import * as React from "react";

// Brand intro overlay — fully code-drawn (replaced the 8s /intro.mp4 reel).
// The animation is built from the real brand geometry (TWMonogram wedges +
// wordmark type), so it always matches the product around it: no codec blur,
// no buffering, instant first frame, ~3s instead of 8s. Sequence:
//   1. a trendy-pink wheel ring draws itself + spins, lime speed streaks pass
//   2. the monogram wedges pop in, the pink dot lands with a bounce
//   3. TRENDY.WHEELS slides up with the BUY · RENT · SERVICE strapline
//   4. a light shimmer sweeps the lockup, then the overlay fades out
// Persistence modes (unchanged contract):
//   mode="device"  — localStorage flag, once per device (customer surface)
//   mode="session" — sessionStorage flag, once per browser session (staff)
// Honors prefers-reduced-motion: static lockup, short fade, no movement.

const INTRO_BG = "#02011F";
const FRIENDLY_BLUE = "#2B0FF8";
const TRENDY_PINK = "#FF0065";
const ECO_LIME = "#A9F453";
const POOL_BLUE = "#00C7EA";
const FADE_MS = 400;
const REEL_MS = 3000; // auto-dismiss after the sequence completes
const SAFETY_TIMEOUT_MS = 4500; // reel + slack, in case timers are throttled
const STORAGE_KEY = "tw-intro-seen-v1";

const FONT_DISPLAY = "Anton, Impact, 'Bebas Neue', system-ui, sans-serif";
const FONT_BODY = "'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif";

type Props = {
  mode: "device" | "session";
};

export function IntroOverlay({ mode }: Props): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<"hidden" | "visible" | "fading">("hidden");
  const fadeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = React.useRef(phase);
  phaseRef.current = phase;

  const dismiss = React.useCallback((): void => {
    if (phaseRef.current === "hidden" || phaseRef.current === "fading") return;
    setPhase("fading");
    fadeTimerRef.current = setTimeout(() => {
      const store = mode === "device" ? window.localStorage : window.sessionStorage;
      try {
        store.setItem(STORAGE_KEY, "1");
      } catch {
        // Private mode etc — fall through, just don't persist.
      }
      setPhase("hidden");
    }, FADE_MS);
  }, [mode]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const store = mode === "device" ? window.localStorage : window.sessionStorage;
    if (store.getItem(STORAGE_KEY)) return;
    setPhase("visible");

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const reel = setTimeout(() => dismiss(), reduced ? 1200 : REEL_MS);
    const safety = setTimeout(() => dismiss(), SAFETY_TIMEOUT_MS);
    return () => {
      clearTimeout(reel);
      clearTimeout(safety);
    };
  }, [mode, dismiss]);

  React.useEffect(() => {
    // Lock body scroll while overlay is on screen
    if (phase === "hidden") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  React.useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      aria-hidden={phase === "fading"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: INTRO_BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: phase === "fading" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms cubic-bezier(.2,.7,.3,1)`,
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ambient glow behind the lockup */}
      <div
        className="twi-glow"
        style={{
          position: "absolute",
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${POOL_BLUE}14 0%, transparent 62%)`,
        }}
      />

      {/* speed streaks crossing behind the wheel */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="twi-streak"
          style={{
            position: "absolute",
            top: `calc(50% + ${[-72, -10, 52][i]}px)`,
            left: 0,
            width: [130, 190, 110][i],
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${i === 1 ? ECO_LIME : POOL_BLUE}, transparent)`,
            animationDelay: `${i * 130}ms`,
            opacity: 0,
          }}
        />
      ))}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        {/* wheel ring + monogram */}
        <div style={{ position: "relative", width: 168, height: 168 }}>
          <svg
            width="168"
            height="168"
            viewBox="0 0 168 168"
            style={{ position: "absolute", inset: 0 }}
          >
            <circle
              className="twi-ring"
              cx="84"
              cy="84"
              r="76"
              fill="none"
              stroke={TRENDY_PINK}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="478"
              strokeDashoffset="478"
              transform="rotate(-90 84 84)"
            />
          </svg>
          <svg
            width="96"
            height="96"
            viewBox="0 0 64 64"
            style={{ position: "absolute", top: 36, left: 36 }}
          >
            <defs>
              <linearGradient id="twi-fade" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={FRIENDLY_BLUE} />
                <stop offset="1" stopColor={INTRO_BG} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* same wedge geometry as TWMonogram (web.tsx) */}
            <path
              className="twi-wedge twi-wedge-1"
              d="M26 8 h12 a4 4 0 0 1 4 4 v40 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 v-40 a4 4 0 0 1 4 -4 z"
              fill={FRIENDLY_BLUE}
            />
            <path
              className="twi-wedge twi-wedge-2"
              d="M10 16 h20 v12 h-12 a8 8 0 0 1 -8 -8 z"
              fill={FRIENDLY_BLUE}
              opacity="0.92"
            />
            <path
              className="twi-wedge twi-wedge-3"
              d="M34 16 h20 a0 0 0 0 1 0 0 v4 a8 8 0 0 1 -8 8 h-12 z"
              fill="url(#twi-fade)"
            />
            <circle className="twi-dot" cx="50" cy="50" r="4" fill={TRENDY_PINK} />
          </svg>
        </div>

        {/* wordmark + strapline */}
        <div style={{ position: "relative", overflow: "hidden", textAlign: "center" }}>
          <div
            className="twi-word"
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 34,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: "#fff",
              lineHeight: 1,
            }}
          >
            Trendy<span style={{ color: TRENDY_PINK }}>.</span>Wheels
          </div>
          <div
            className="twi-strap"
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 300,
              fontSize: 12,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.62)",
              marginTop: 10,
            }}
          >
            Buy · Rent · Service
          </div>
          {/* shimmer sweep across the lockup */}
          <div
            className="twi-shimmer"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.35) 50%, transparent 62%)",
              transform: "translateX(-120%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={dismiss}
        style={{
          position: "absolute",
          right: 16,
          bottom: 24,
          padding: "10px 16px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.3,
          cursor: "pointer",
        }}
      >
        Skip ▸
      </button>
    </div>
  );
}

// Timeline (ms): ring 0–900 · streaks 100–1000 · wedges 500–1200 ·
// dot 1250 · wordmark 1200–1800 · shimmer 1900–2500 · dismiss 3000.
const KEYFRAMES = `
@keyframes twi-ring-draw {
  0%   { stroke-dashoffset: 478; transform: rotate(-90deg); }
  70%  { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; transform: rotate(270deg); }
}
.twi-ring {
  transform-origin: 84px 84px;
  animation: twi-ring-draw 1100ms cubic-bezier(.3,.6,.2,1) forwards;
}
@keyframes twi-streak-fly {
  0%   { opacity: 0; transform: translateX(-30vw); }
  25%  { opacity: 0.9; }
  100% { opacity: 0; transform: translateX(110vw); }
}
.twi-streak { animation: twi-streak-fly 900ms cubic-bezier(.2,.7,.3,1) forwards; }
@keyframes twi-pop {
  0%   { opacity: 0; transform: scale(0.6); }
  70%  { opacity: 1; transform: scale(1.06); }
  100% { opacity: 1; transform: scale(1); }
}
.twi-wedge { opacity: 0; transform-origin: 32px 32px; animation: twi-pop 360ms cubic-bezier(.2,.8,.3,1.2) forwards; }
.twi-wedge-1 { animation-delay: 500ms; }
.twi-wedge-2 { animation-delay: 640ms; }
.twi-wedge-3 { animation-delay: 780ms; }
@keyframes twi-dot-land {
  0%   { opacity: 0; transform: translateY(-14px) scale(0.4); }
  60%  { opacity: 1; transform: translateY(2px) scale(1.25); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.twi-dot { opacity: 0; transform-origin: 50px 50px; animation: twi-dot-land 420ms cubic-bezier(.3,1.2,.4,1) 1250ms forwards; }
@keyframes twi-rise {
  from { opacity: 0; transform: translateY(26px); }
  to   { opacity: 1; transform: translateY(0); }
}
.twi-word  { opacity: 0; animation: twi-rise 520ms cubic-bezier(.2,.8,.3,1) 1200ms forwards; }
.twi-strap { opacity: 0; animation: twi-rise 520ms cubic-bezier(.2,.8,.3,1) 1420ms forwards; }
@keyframes twi-sweep {
  from { transform: translateX(-120%); }
  to   { transform: translateX(120%); }
}
.twi-shimmer { animation: twi-sweep 600ms cubic-bezier(.4,.2,.3,1) 1900ms forwards; }
@keyframes twi-breathe {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50%      { transform: scale(1.12); opacity: 1; }
}
.twi-glow { animation: twi-breathe 2600ms ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .twi-ring { animation: none; stroke-dashoffset: 0; }
  .twi-streak, .twi-shimmer { animation: none; opacity: 0; }
  .twi-glow { animation: none; }
  .twi-wedge, .twi-dot, .twi-word, .twi-strap { animation: none; opacity: 1; transform: none; }
}
`;
