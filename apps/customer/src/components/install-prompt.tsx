"use client";

import { useEffect, useState } from "react";

// Install-to-home-screen banner.
//
// Two flavors:
// - Chrome/Android: capture beforeinstallprompt, expose Install button
// - iOS Safari: no API exists, so show instructions ("Share → Add to Home Screen")
//
// Dismissal honored for 30 days. Hides immediately if app is already
// running standalone (`display-mode: standalone`).

const DISMISS_KEY = "tw-install-dismissed-until";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt(): React.JSX.Element | null {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip if already installed
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;
    // Skip if dismissed recently
    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || "0");
    if (dismissedUntil > Date.now()) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Android/.test(ua);

    if (isIOS && isSafari) {
      // Show iOS instructions after a short delay (don't interrupt initial paint)
      const t = setTimeout(() => {
        setShowIos(true);
        setHidden(false);
      }, 4000);
      return () => clearTimeout(t);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (hidden) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setHidden(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setHidden(true);
    if (outcome === "dismissed") dismiss();
  }

  return (
    <div
      role="dialog"
      aria-label="Install TrendyWheels"
      className="tw-install-prompt tw-safe-bottom"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 84,
        zIndex: 35,
        background: "linear-gradient(135deg, #0B2876, #1559C9)",
        color: "#fff",
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 10px 30px rgba(2,1,31,0.25)",
        animation: "twInstallSlide 320ms cubic-bezier(.2,.7,.3,1) both",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Install TrendyWheels</div>
        <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
          {showIos
            ? "Tap Share → Add to Home Screen for the full app experience."
            : "Add to your home screen for the full app experience."}
        </div>
      </div>
      {!showIos && deferred ? (
        <button
          onClick={install}
          className="tw-press tw-tap"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "#FF0065",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Install
        </button>
      ) : null}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="tw-tap"
        style={{
          padding: 8,
          borderRadius: 8,
          border: "none",
          background: "rgba(255,255,255,0.12)",
          color: "#fff",
          fontSize: 16,
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        ✕
      </button>
      <style jsx>{`
        @keyframes twInstallSlide {
          from {
            transform: translateY(40px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @media (min-width: 768px) {
          .tw-install-prompt {
            left: auto !important;
            right: 24px !important;
            bottom: 24px !important;
            max-width: 380px;
          }
        }
      `}</style>
    </div>
  );
}
