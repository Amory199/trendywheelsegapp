import { useEffect, useRef, useState } from "react";

/**
 * Animate a number from 0 → target over `durationMs` using requestAnimationFrame.
 * Works for ints (default) or formatted decimals when `decimals > 0`.
 *
 * Usage: const display = useCounter(1234); → returns "1,234" (interpolated each frame)
 */
export function useCounter(target: number, durationMs = 800, decimals = 0): string {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const targetRef = useRef(target);

  useEffect(() => {
    if (target === targetRef.current && startRef.current !== null) return;
    targetRef.current = target;
    const start = value;
    const delta = target - start;
    startRef.current = performance.now();
    let raf: number;

    const tick = (now: number): void => {
      const elapsed = now - (startRef.current ?? now);
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = start + delta * eased;
      setValue(current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();
}
