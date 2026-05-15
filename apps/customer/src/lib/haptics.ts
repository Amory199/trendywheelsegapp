// Native-feel haptic feedback for button presses.
// Browser support is patchy (Chrome Android = yes, iOS Safari = no),
// but it costs ~5 lines and degrades silently where unsupported.

export function twHapticTap(): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate(10);
}

export function twHapticSuccess(): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate([15, 30, 15]);
}

export function twHapticError(): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate([50, 50, 50]);
}
