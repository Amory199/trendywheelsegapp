import { createAudioPlayer, type AudioSource } from "expo-audio";

// Tiny synth-generated sound effects (each <3KB). Loaded once at module
// import via createAudioPlayer so playback is instant on the first tap.

const SOURCES: Record<SoundKey, AudioSource> = {
  success: require("../assets/sounds/success.mp3"),
  error: require("../assets/sounds/error.mp3"),
  tap: require("../assets/sounds/tap.mp3"),
  celebrate: require("../assets/sounds/celebrate.mp3"),
};

export type SoundKey = "success" | "error" | "tap" | "celebrate";

const players: Partial<Record<SoundKey, ReturnType<typeof createAudioPlayer>>> = {};

function getPlayer(key: SoundKey): ReturnType<typeof createAudioPlayer> | null {
  if (!players[key]) {
    try {
      players[key] = createAudioPlayer(SOURCES[key]);
    } catch {
      return null;
    }
  }
  return players[key] ?? null;
}

export function playSound(key: SoundKey): void {
  const p = getPlayer(key);
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {
    // ignore — playback is best-effort, never block the UI
  }
}
