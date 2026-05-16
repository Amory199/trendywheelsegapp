"use client";

import * as React from "react";

// Brand-reel intro overlay. Plays /intro.mp4 full-screen once, fades into the
// page. Two persistence modes:
//   mode="device"  — localStorage flag, once per device (customer surface)
//   mode="session" — sessionStorage flag, once per browser session (staff)
//
// Background is the MP4's first-frame color so there is no white flash while
// the video buffers. Skip button always visible. Safety timer dismisses the
// overlay if onEnded never fires.

const INTRO_BG = "#02011F";
const FADE_MS = 400;
const SAFETY_TIMEOUT_MS = 9500; // 8s reel + 1.5s slack
const STORAGE_KEY = "tw-intro-seen-v1";

type Props = {
  mode: "device" | "session";
};

export function IntroOverlay({ mode }: Props): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<"hidden" | "visible" | "fading">("hidden");
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const fadeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const store = mode === "device" ? window.localStorage : window.sessionStorage;
    if (store.getItem(STORAGE_KEY)) return;
    setPhase("visible");

    const safety = setTimeout(() => {
      dismiss();
    }, SAFETY_TIMEOUT_MS);

    return () => clearTimeout(safety);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  React.useEffect(() => {
    // Lock body scroll while overlay is on screen
    if (phase === "hidden") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  function dismiss(): void {
    if (phase === "hidden" || phase === "fading") return;
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
  }

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
        opacity: phase === "fading" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms cubic-bezier(.2,.7,.3,1)`,
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        poster="/intro-poster.jpg"
        onEnded={dismiss}
        onError={dismiss}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: INTRO_BG,
        }}
      >
        <source src="/intro.mp4" type="video/mp4" />
      </video>
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
