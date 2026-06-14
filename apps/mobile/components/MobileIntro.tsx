import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import * as React from "react";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import SvgRaw, {
  Defs as DefsRaw,
  LinearGradient as LinearGradientRaw,
  Path as PathRaw,
  RadialGradient as RadialGradientRaw,
  Rect as RectRaw,
  Stop as StopRaw,
} from "react-native-svg";

// react-native-svg's exported components fight the app's React types; an
// `as unknown as FC` cast keeps the JSX well-typed.
const Svg = SvgRaw as unknown as React.FC<React.ComponentProps<typeof SvgRaw>>;
const Defs = DefsRaw as unknown as React.FC<React.ComponentProps<typeof DefsRaw>>;
const Path = PathRaw as unknown as React.FC<React.ComponentProps<typeof PathRaw>>;
const Rect = RectRaw as unknown as React.FC<React.ComponentProps<typeof RectRaw>>;
const LinearGradient = LinearGradientRaw as unknown as React.FC<
  React.ComponentProps<typeof LinearGradientRaw>
>;
const RadialGradient = RadialGradientRaw as unknown as React.FC<
  React.ComponentProps<typeof RadialGradientRaw>
>;
const Stop = StopRaw as unknown as React.FC<React.ComponentProps<typeof StopRaw>>;

// Branded cold-start intro — a code-driven recreation of the official brand
// reel (Social Media/post 1.mp4): a deep friendly-blue swoosh sweeps in over a
// black stage, the REAL TrendyWheels lockup (assets/brand-logo.png, the white
// mark used on the admin-web finale) blooms in over a soft glow, and the
// "Ride & Vibe" strapline rises beneath it. Holds, then fades into the app.
// Plays once per launch (module flag, resets on cold start) and is skippable.
// Pure Reanimated + SVG — no video, instant first frame, no clipped first play.
const FRIENDLY_BLUE = colors.brand.friendlyBlue;
const LOGO = require("../assets/brand-logo.png");
const LOGO_RATIO = 720 / 416; // brand-logo.png native dimensions

const SWEEP_MS = 760;
const LOGO_DELAY = 540;
const LOGO_IN_MS = 640;
const STRAP_DELAY = 1180;
const STRAP_IN_MS = 440;
const HOLD_MS = 1120;
const OUT_MS = 460;

let playedThisLaunch = false;

export function MobileIntro(): React.JSX.Element | null {
  const { width: W, height: H } = useWindowDimensions();
  const [visible, setVisible] = useState(!playedThisLaunch);

  const opacity = useSharedValue(1);
  const sweep = useSharedValue(0); // 0 → 1 swoosh slides down + fades in
  const logoIn = useSharedValue(0); // 0 → 1 lockup bloom
  const strapIn = useSharedValue(0); // 0 → 1 strapline rise
  const glow = useSharedValue(0); // ambient bloom pulse

  useEffect(() => {
    if (playedThisLaunch) return;
    playedThisLaunch = true;

    sweep.value = withTiming(1, { duration: SWEEP_MS, easing: Easing.out(Easing.cubic) });
    logoIn.value = withDelay(
      LOGO_DELAY,
      withTiming(1, { duration: LOGO_IN_MS, easing: Easing.out(Easing.back(1.3)) }),
    );
    strapIn.value = withDelay(
      STRAP_DELAY,
      withTiming(1, { duration: STRAP_IN_MS, easing: Easing.out(Easing.cubic) }),
    );
    glow.value = withDelay(
      LOGO_DELAY,
      withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true),
    );

    opacity.value = withDelay(
      STRAP_DELAY + STRAP_IN_MS + HOLD_MS,
      withTiming(0, { duration: OUT_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setVisible)(false);
      }),
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(glow);
      cancelAnimation(sweep);
    };
  }, [glow, logoIn, opacity, strapIn, sweep]);

  const dismiss = (): void => {
    cancelAnimation(opacity);
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(setVisible)(false);
    });
  };

  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const swooshStyle = useAnimatedStyle(() => ({
    opacity: sweep.value,
    transform: [
      { translateY: (1 - sweep.value) * -H * 0.32 },
      { scale: 1.06 - sweep.value * 0.06 },
    ],
  }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + glow.value * 0.45,
    transform: [{ scale: 0.92 + glow.value * 0.16 }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoIn.value,
    transform: [{ scale: 0.86 + logoIn.value * 0.14 }],
  }));
  const strapStyle = useAnimatedStyle(() => ({
    opacity: strapIn.value,
    transform: [{ translateY: (1 - strapIn.value) * 14 }],
  }));

  if (!visible) return null;

  const swooshSize = W * 1.3;
  const bloomSize = W * 0.95;
  const logoW = Math.min(W * 0.74, 320);
  const logoH = logoW / LOGO_RATIO;

  return (
    <Animated.View style={[styles.root, rootStyle]}>
      {/* deep-blue swoosh sweeping in from the top, melting into the black stage */}
      <Animated.View
        style={[
          styles.swoosh,
          { width: swooshSize, height: swooshSize, top: -H * 0.04, left: -W * 0.14 },
          swooshStyle,
        ]}
        pointerEvents="none"
      >
        <Svg width={swooshSize} height={swooshSize} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="tw-swoosh" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#4A28FF" />
              <Stop offset="0.36" stopColor={FRIENDLY_BLUE} />
              <Stop offset="0.74" stopColor="#160a4d" />
              <Stop offset="1" stopColor={FRIENDLY_BLUE} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d="M0 0 H70 C92 18 90 45 66 61 C50 71 56 88 40 100 H0 Z" fill="url(#tw-swoosh)" />
        </Svg>
      </Animated.View>

      {/* soft bloom behind the lockup */}
      <Animated.View
        style={[styles.bloom, { width: bloomSize, height: bloomSize }, bloomStyle]}
        pointerEvents="none"
      >
        <Svg width={bloomSize} height={bloomSize} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="tw-bloom" cx="50" cy="50" r="50">
              <Stop offset="0" stopColor={FRIENDLY_BLUE} stopOpacity="0.5" />
              <Stop offset="0.55" stopColor={colors.brand.poolBlue} stopOpacity="0.12" />
              <Stop offset="1" stopColor={FRIENDLY_BLUE} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#tw-bloom)" />
        </Svg>
      </Animated.View>

      {/* the real brand lockup */}
      <Animated.View style={logoStyle}>
        <Image
          source={LOGO}
          style={{ width: logoW, height: logoH }}
          contentFit="contain"
          transition={0}
        />
      </Animated.View>

      <Animated.Text style={[styles.strap, strapStyle]}>Ride & Vibe</Animated.Text>

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
    backgroundColor: "#05021A",
    alignItems: "center",
    justifyContent: "center",
  },
  swoosh: { position: "absolute" },
  bloom: { position: "absolute", alignItems: "center", justifyContent: "center" },
  strap: {
    position: "absolute",
    bottom: "22%",
    color: "rgba(255,255,255,0.82)",
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: 3,
  },
  skip: { position: "absolute", bottom: 40, right: 20, padding: 10 },
  skipText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600" },
});
