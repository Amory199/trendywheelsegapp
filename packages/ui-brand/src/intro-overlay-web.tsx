"use client";

import * as React from "react";

// Brand intro overlay — fully code-drawn (replaced the 8s /intro.mp4 reel).
// Three acts, ~3.6s total:
//   1. a trendy-pink wheel ring draws itself + spins while lime/pool speed
//      streaks fly past, and TRENDY.WHEELS rises with the strapline
//   2. act one exits (ring shrinks away, type slips down)
//   3. finale — the REAL brand mark (/brand-logo.png, provided by the host
//      app's public dir) blooms in from a blur with a glow, and a light sheen
//      sweeps across it, masked to the logo's own alpha so the shine lives
//      inside the mark. It holds the closing frame, then the overlay fades.
// Persistence modes (unchanged contract):
//   mode="device"  — localStorage flag, once per device (customer surface)
//   mode="session" — sessionStorage flag, once per browser session (staff)
// Honors prefers-reduced-motion: static closing frame, short fade, no motion.

const INTRO_BG = "#02011F";
const TRENDY_PINK = "#FF0065";
const ECO_LIME = "#A9F453";
const POOL_BLUE = "#00C7EA";
const LOGO_SRC = "/brand-logo.png";
const FADE_MS = 400;
const REEL_MS = 3600; // auto-dismiss after the sequence completes
const SAFETY_TIMEOUT_MS = 5200; // reel + slack, in case timers are throttled
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
    const reel = setTimeout(() => dismiss(), reduced ? 1400 : REEL_MS);
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

      {/* ambient glow behind everything */}
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

      {/* ACT 1 — wheel ring + wordmark; exits before the finale */}
      <div
        className="twi-act1"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}
      >
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle
            className="twi-ring"
            cx="75"
            cy="75"
            r="66"
            fill="none"
            stroke={TRENDY_PINK}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="415"
            strokeDashoffset="415"
          />
          <circle className="twi-hub" cx="75" cy="75" r="7" fill={TRENDY_PINK} />
        </svg>
        <div style={{ textAlign: "center" }}>
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
        </div>
      </div>

      {/* ACT 2 — finale: the real brand mark blooms in and holds the frame */}
      <div
        className="twi-act2"
        style={{
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* bloom behind the mark */}
        <div
          className="twi-logo-bloom"
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: `radial-gradient(circle, #2B0FF826 0%, ${POOL_BLUE}10 40%, transparent 65%)`,
          }}
        />
        <div style={{ position: "relative", width: 320, height: 185 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SRC}
            alt="TrendyWheels"
            width={320}
            height={185}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
          />
          {/* sheen masked to the logo's own alpha — the shine lives inside the mark */}
          <div
            className="twi-logo-sheen"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.85) 50%, transparent 62%)",
              backgroundSize: "300% 100%",
              backgroundPosition: "120% 0",
              backgroundRepeat: "no-repeat",
              WebkitMaskImage: `url(${LOGO_SRC})`,
              maskImage: `url(${LOGO_SRC})`,
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
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

// Timeline (ms): ring 0–1000 · streaks 100–1000 · hub 950 · wordmark 800–1500
// · act1 exits 1800–2200 · logo blooms 2150–2900 · sheen 2800–3400 · out 3600.
const KEYFRAMES = `
@keyframes twi-ring-draw {
  0%   { stroke-dashoffset: 415; transform: rotate(-90deg); }
  70%  { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; transform: rotate(270deg); }
}
.twi-ring {
  transform-origin: 75px 75px;
  animation: twi-ring-draw 1000ms cubic-bezier(.3,.6,.2,1) forwards;
}
@keyframes twi-pop {
  0%   { opacity: 0; transform: scale(0.4); }
  70%  { opacity: 1; transform: scale(1.3); }
  100% { opacity: 1; transform: scale(1); }
}
.twi-hub { opacity: 0; transform-origin: 75px 75px; animation: twi-pop 320ms cubic-bezier(.3,1.2,.4,1) 950ms forwards; }
@keyframes twi-streak-fly {
  0%   { opacity: 0; transform: translateX(-30vw); }
  25%  { opacity: 0.9; }
  100% { opacity: 0; transform: translateX(110vw); }
}
.twi-streak { animation: twi-streak-fly 900ms cubic-bezier(.2,.7,.3,1) forwards; }
@keyframes twi-rise {
  from { opacity: 0; transform: translateY(26px); }
  to   { opacity: 1; transform: translateY(0); }
}
.twi-word  { opacity: 0; animation: twi-rise 520ms cubic-bezier(.2,.8,.3,1) 800ms forwards; }
.twi-strap { opacity: 0; animation: twi-rise 520ms cubic-bezier(.2,.8,.3,1) 1020ms forwards; }
@keyframes twi-act1-exit {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.9); }
}
.twi-act1 { animation: twi-act1-exit 400ms cubic-bezier(.4,.2,.6,1) 1800ms forwards; }
@keyframes twi-logo-bloom-in {
  0%   { opacity: 0; transform: scale(1.18); filter: blur(16px); }
  60%  { opacity: 1; filter: blur(2px); }
  100% { opacity: 1; transform: scale(1); filter: blur(0); }
}
.twi-act2 { opacity: 0; animation: twi-logo-bloom-in 750ms cubic-bezier(.2,.7,.3,1) 2150ms forwards; }
@keyframes twi-bloom-pulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50%      { transform: scale(1.1); opacity: 1; }
}
.twi-logo-bloom { animation: twi-bloom-pulse 1800ms ease-in-out 2150ms infinite; }
@keyframes twi-sheen-sweep {
  from { background-position: 120% 0; }
  to   { background-position: -120% 0; }
}
.twi-logo-sheen { animation: twi-sheen-sweep 650ms cubic-bezier(.4,.2,.3,1) 2800ms forwards; }
@keyframes twi-breathe {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50%      { transform: scale(1.12); opacity: 1; }
}
.twi-glow { animation: twi-breathe 2600ms ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .twi-ring { animation: none; stroke-dashoffset: 0; }
  .twi-hub { animation: none; opacity: 1; }
  .twi-streak { animation: none; opacity: 0; }
  .twi-glow, .twi-logo-bloom, .twi-logo-sheen { animation: none; }
  .twi-act1 { animation: none; opacity: 0; }
  .twi-act2 { animation: none; opacity: 1; }
  .twi-word, .twi-strap { animation: none; opacity: 1; transform: none; }
}
`;
