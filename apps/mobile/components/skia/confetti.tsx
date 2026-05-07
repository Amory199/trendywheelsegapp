import { Canvas, Group, Rect } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const COLORS = ["#FF0065", "#2B0FF8", "#A9F453", "#00C7EA", "#FFD93D"];

interface Particle {
  x: number;
  driftX: number;
  size: number;
  rotation: number;
  rotationDelta: number;
  color: string;
  delay: number;
  duration: number;
}

interface Props {
  count?: number;
  /**
   * Set false to skip the auto-fire on mount (e.g. when you want to
   * trigger manually).
   */
  autoStart?: boolean;
}

export function TWSkiaConfetti({ count = 80, autoStart = true }: Props): JSX.Element {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        x: (i / count) * SCREEN_W + (Math.random() * 30 - 15),
        driftX: (Math.random() - 0.5) * 80,
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
        rotationDelta: 540 + Math.random() * 360,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 300,
        duration: 2200 + Math.random() * 1400,
      })),
    [count],
  );

  const progress = useSharedValue(0);

  useMemo(() => {
    if (autoStart) {
      progress.value = withDelay(0, withTiming(1, { duration: 3600, easing: Easing.linear }));
    }
  }, [autoStart, progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        {particles.map((p, idx) => (
          <ConfettiPiece key={idx} particle={p} progress={progress} />
        ))}
      </Canvas>
    </View>
  );
}

function ConfettiPiece({
  particle,
  progress,
}: {
  particle: Particle;
  progress: ReturnType<typeof useSharedValue<number>>;
}): JSX.Element {
  const { x, driftX, size, rotation, rotationDelta, color, delay, duration } = particle;

  const localT = useDerivedValue(() => {
    const elapsed = progress.value * 3600 - delay;
    if (elapsed <= 0) return 0;
    if (elapsed >= duration) return 1;
    return elapsed / duration;
  });

  const cy = useDerivedValue(() => -20 + localT.value * (SCREEN_H + 60));
  const dx = useDerivedValue(() => x + localT.value * driftX);
  const rot = useDerivedValue(() => ((rotation + localT.value * rotationDelta) * Math.PI) / 180);
  const opacity = useDerivedValue(() => {
    const t = localT.value;
    if (t < 0.85) return 1;
    return Math.max(0, 1 - (t - 0.85) / 0.15);
  });

  const transform = useDerivedValue(() => [{ rotate: rot.value }]);
  const origin = useDerivedValue(() => ({ x: dx.value + size / 2, y: cy.value + size / 2 }));

  return (
    <Group transform={transform} origin={origin} opacity={opacity}>
      <Rect x={dx} y={cy} width={size} height={size * 0.4} color={color} />
    </Group>
  );
}
