"use client";

import * as React from "react";

// TWParticleHero — Canvas 2D particle field. Lightweight (no WASM, no extra
// dependencies). Drifting brand-color orbs on a transparent canvas, perfect
// as a hero backdrop layer. Pairs `mix-blend-mode: screen` on dark heroes
// or `multiply` on light heroes — caller chooses via the blend prop.
//
// Why Canvas 2D, not CanvasKit/Skia WASM: a 3-4MB WASM payload for hero
// glow would tank Lighthouse and our customer is on Egyptian-resort 4G.
// The visual difference vs Skia is negligible at this scale.

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  alpha: number;
};

const BRAND_COLORS = [
  "#2B0FF8", // friendly blue
  "#FF0065", // trendy pink
  "#00C7EA", // pool blue
  "#A9F453", // eco limelight
];

export function TWParticleHero({
  count = 18,
  blend = "screen",
  colors = BRAND_COLORS,
  className,
  style,
}: {
  count?: number;
  blend?: "screen" | "multiply" | "lighten" | "normal";
  colors?: string[];
  className?: string;
  style?: React.CSSProperties;
}): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const particlesRef = React.useRef<Particle[]>([]);
  const dprRef = React.useRef<number>(1);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;

    const sizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    };

    const seed = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      particlesRef.current = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.14,
        r: 60 + Math.random() * 120,
        color: colors[i % colors.length] ?? "#2B0FF8",
        alpha: 0.22 + Math.random() * 0.18,
      }));
    };

    sizeCanvas();
    seed();

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -p.r) p.x = w + p.r;
        if (p.x > w + p.r) p.x = -p.r;
        if (p.y < -p.r) p.y = h + p.r;
        if (p.y > h + p.r) p.y = -p.r;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, hexWithAlpha(p.color, p.alpha));
        grad.addColorStop(1, hexWithAlpha(p.color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const onResize = () => {
      sizeCanvas();
      seed();
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [count, colors]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        mixBlendMode: blend,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
