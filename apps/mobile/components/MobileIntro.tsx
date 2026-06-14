import { colors } from "@trendywheels/ui-tokens";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { TWLogoLockup } from "./BrandMark";

// Branded cold-start intro: the TrendyWheels lockup (SVG monogram + wordmark,
// identical to the admin-web finale) blooms in over a pulsing glow, holds, then
// fades into the app. Plays once per app launch (module flag, resets on cold
// start) and is skippable. Pure Reanimated — no video, instant first frame.
const IN_MS = 650;
const HOLD_MS = 1150;
const OUT_MS = 420;

let playedThisLaunch = false;

export function MobileIntro(): React.JSX.Element | null {
  const [visible, setVisible] = useState(!playedThisLaunch);
  const opacity = useSharedValue(1);
  const logoScale = useSharedValue(0.84);
  const logoOpacity = useSharedValue(0);
  const glow = useSharedValue(0.7);

  useEffect(() => {
    if (playedThisLaunch) return;
    playedThisLaunch = true;

    logoOpacity.value = withTiming(1, { duration: IN_MS, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: IN_MS, easing: Easing.out(Easing.back(1.4)) });
    glow.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );

    opacity.value = withDelay(
      IN_MS + HOLD_MS,
      withTiming(0, { duration: OUT_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setVisible)(false);
      }),
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(glow);
    };
  }, [glow, logoOpacity, logoScale, opacity]);

  const dismiss = (): void => {
    cancelAnimation(opacity);
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(setVisible)(false);
    });
  };

  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + glow.value * 0.35,
    transform: [{ scale: 0.9 + glow.value * 0.2 }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.root, rootStyle]}>
      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
      <Animated.View style={logoStyle}>
        <TWLogoLockup size={58} color="#FFFFFF" />
      </Animated.View>
      <Pressable style={styles.skip} onPress={dismiss} hitSlop={12}>
        <Text style={styles.skipText}>Skip ▸</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    backgroundColor: colors.dark.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: colors.brand.poolBlue,
  },
  skip: { position: "absolute", bottom: 40, right: 20, padding: 10 },
  skipText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600" },
});
