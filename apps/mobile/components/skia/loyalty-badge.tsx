import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  Skia,
  SweepGradient,
  vec,
} from "@shopify/react-native-skia";
import type { LoyaltyTier } from "@trendywheels/types";
import { colors } from "@trendywheels/ui-tokens";
import { useEffect } from "react";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// 3-stop palette specific to the Skia sweep — the simpler 2-stop TIER_COLORS
// shared from ui-tokens is meant for flat gradients. This badge needs a mid
// stop for the rotating highlight, so we keep a richer per-tier palette here.
const TIER_PALETTE: Record<LoyaltyTier, [string, string, string]> = {
  bronze: ["#7B3F1F", "#C97D45", "#E8A567"],
  silver: ["#535362", "#A2A2B5", "#D9D9E4"],
  gold: ["#7A5A0F", "#E8B341", "#FFE89B"],
  platinum: [colors.brand.friendlyBlue, "#5C7BFF", colors.brand.poolBlue],
};

interface Props {
  tier: LoyaltyTier;
  size?: number;
  starColor?: string;
}

export function TWLoyaltyBadge({ tier, size = 64, starColor }: Props): JSX.Element {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const palette = TIER_PALETTE[tier];

  const sweepRotation = useSharedValue(0);

  useEffect(() => {
    sweepRotation.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 5400, easing: Easing.linear }),
      -1,
      false,
    );
  }, [sweepRotation]);

  const transform = useDerivedValue(() => [{ rotate: sweepRotation.value }]);

  const star = Skia.Path.MakeFromSVGString(STAR_PATH)!;

  return (
    <Canvas style={{ width: size, height: size }}>
      <Circle cx={cx} cy={cy} r={r}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(size, size)}
          colors={[palette[0], palette[1], palette[2]]}
          positions={[0, 0.55, 1]}
        />
      </Circle>

      <Group origin={vec(cx, cy)} transform={transform}>
        <Circle cx={cx} cy={cy} r={r} opacity={0.5}>
          <SweepGradient
            c={vec(cx, cy)}
            colors={[
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0.55)",
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0)",
            ]}
          />
        </Circle>
      </Group>

      <Group transform={[{ translateX: cx - 12 }, { translateY: cy - 12 }, { scale: 0.5 }]}>
        <Path path={star} color={starColor ?? "#FFFFFF"} />
      </Group>
    </Canvas>
  );
}

const STAR_PATH =
  "M24 2 L29.39 17.4 L46 17.4 L32.6 27.6 L37.99 43 L24 32.8 L10.01 43 L15.4 27.6 L2 17.4 L18.61 17.4 Z";
