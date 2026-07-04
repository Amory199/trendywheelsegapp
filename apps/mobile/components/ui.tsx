import { Ionicons } from "@expo/vector-icons";
import { colors, twPalette, type Palette } from "@trendywheels/ui-tokens";
import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient as SvgRadialGradient, Rect, Stop } from "react-native-svg";

import { useAuroraScrollY } from "../lib/tab-bar-scroll";
import { useTheme } from "../lib/use-theme";

// Frozen palettes kept for legacy module-level styles. Prefer useTheme() in
// new code so screens respond to the user's theme toggle.
export const palette: Palette = twPalette(true);
export const darkPalette: Palette = twPalette(true);
export const lightPalette: Palette = twPalette(false);

// ──────────────────────────────────────────────────────────────────────────
// Typography
// ──────────────────────────────────────────────────────────────────────────

// (Removed the unused `typo` scale — it hardcoded Anton + letterSpacing, the
// exact pattern that breaks Arabic joining. Localized headings use the
// locale-aware useDisplay()/useTracking() from lib/typography instead.)

// ──────────────────────────────────────────────────────────────────────────
// TWCard — rounded surface with subtle border, used everywhere.
// ──────────────────────────────────────────────────────────────────────────

export function TWCard({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}): React.JSX.Element {
  const { palette: p, isDark } = useTheme();
  // Light mode: a soft drop shadow so white cards lift off the dawn-tinted bg
  // (light's counterpart to the dark glass sheen). Dark keeps the sheen below.
  const lightLift = !isDark
    ? {
        shadowColor: "#1B1750",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 3,
      }
    : null;
  return (
    <View
      style={[
        {
          backgroundColor: p.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: p.border,
          padding: padded ? 16 : 0,
          overflow: "hidden",
        },
        lightLift,
        style,
      ]}
    >
      {/* Electric Night glass sheen — a top-lit highlight + a luminous Pool-Blue
          top edge so the card reads as lifted glass rather than a flat block.
          Dark mode only. */}
      {isDark ? (
        <>
          <LinearGradient
            colors={["rgba(255,255,255,0.11)", "rgba(255,255,255,0.02)", "transparent"]}
            locations={[0, 0.5, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "rgba(0,199,234,0.28)",
            }}
          />
        </>
      ) : null}
      {children}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWSkeleton — pulsing placeholder for loading states.
// ──────────────────────────────────────────────────────────────────────────
// Replace ActivityIndicator/spinner wherever we have a known content shape:
// it telegraphs what the user is about to see, which feels faster than a
// generic spinner even when the underlying request takes the same time.

export function TWSkeleton({
  width,
  height,
  radius = 8,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const { palette: p } = useTheme();
  const opacity = useSharedValue(0.4);
  React.useEffect(() => {
    // Drives a slow pulse 0.4 → 0.85 → 0.4 on a loop. Reanimated handles the
    // animation on the UI thread so it never stutters while JS is busy.
    opacity.value = withTiming(0.85, { duration: 900 });
    const id = setInterval(() => {
      opacity.value = withTiming(opacity.value > 0.6 ? 0.4 : 0.85, { duration: 900 });
    }, 900);
    return () => clearInterval(id);
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          width: (width ?? "100%") as ViewStyle["width"],
          height: height ?? 16,
          borderRadius: radius,
          backgroundColor: p.cardAlt,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// Card-shaped skeleton block used when we're loading a list item placeholder.
export function TWSkeletonCard({
  height = 96,
  style,
}: {
  height?: number;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const { palette: p } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: p.card,
          borderColor: p.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          gap: 8,
        },
        style,
      ]}
    >
      <TWSkeleton width="60%" height={14} />
      <TWSkeleton width="40%" height={10} />
      <TWSkeleton width="100%" height={Math.max(0, height - 60)} radius={10} />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWButton — primary (pink/blue) / outline / ghost.
// ──────────────────────────────────────────────────────────────────────────

type ButtonKind = "pink" | "blue" | "outline" | "ghost";

export function TWButton({
  children,
  onPress,
  kind = "pink",
  size = "md",
  icon,
  iconRight,
  full,
  disabled,
  style,
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  kind?: ButtonKind;
  size?: "sm" | "md" | "lg";
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  iconRight?: boolean;
  full?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const { palette: p } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const base = {
    sm: { paddingVertical: 8, paddingHorizontal: 14, fontSize: 13 },
    md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 14 },
    lg: { paddingVertical: 16, paddingHorizontal: 24, fontSize: 16 },
  }[size];

  const tone = {
    pink: { bg: colors.brand.trendyPink, fg: "#FFFFFF", border: "transparent" },
    blue: { bg: colors.brand.friendlyBlue, fg: "#FFFFFF", border: "transparent" },
    outline: { bg: "transparent", fg: p.text, border: p.border },
    ghost: { bg: "transparent", fg: p.text, border: "transparent" },
  }[kind];

  // Electric Night — solid brand fills become a top-lit gradient with a colored
  // glow, so primary CTAs feel like a live light source rather than a flat slab.
  const filled = kind === "pink" || kind === "blue";
  const gradient =
    kind === "pink"
      ? (["#FF2A7D", colors.brand.trendyPink] as const)
      : (["#4A32FF", colors.brand.friendlyBlue] as const);
  const glow =
    filled && !disabled
      ? {
          shadowColor: kind === "pink" ? colors.brand.trendyPink : colors.brand.friendlyBlue,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.55,
          shadowRadius: 14,
          elevation: 8, // Android depth (colored shadow is iOS-only)
        }
      : null;

  return (
    <Animated.View style={[animatedStyle, glow, full ? { alignSelf: "stretch" } : null]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => (scale.value = withTiming(0.96, { duration: 80 }))}
        onPressOut={() => (scale.value = withTiming(1, { duration: 160 }))}
        style={[
          {
            flexDirection: iconRight ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            overflow: "hidden",
            backgroundColor: filled ? "transparent" : tone.bg,
            borderWidth: kind === "outline" ? 1 : 0,
            borderColor: tone.border,
            borderRadius: 12,
            paddingVertical: base.paddingVertical,
            paddingHorizontal: base.paddingHorizontal,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        {filled ? (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {icon ? <Ionicons name={icon} size={base.fontSize + 3} color={tone.fg} /> : null}
        {children != null ? (
          <Text style={{ color: tone.fg, fontSize: base.fontSize, fontWeight: "700" }}>
            {children}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWChip
// ──────────────────────────────────────────────────────────────────────────

export function TWChip({
  children,
  active,
  onPress,
  icon,
}: {
  children: React.ReactNode;
  active?: boolean;
  onPress?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}): React.JSX.Element {
  const { palette: p } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: active ? colors.brand.trendyPink : p.cardAlt,
        borderWidth: 1,
        borderColor: active ? colors.brand.trendyPink : p.border,
      }}
    >
      {icon ? <Ionicons name={icon} size={12} color={active ? "#fff" : p.muted} /> : null}
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: active ? "#fff" : p.text,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWBadge
// ──────────────────────────────────────────────────────────────────────────

type Tone = "blue" | "pink" | "lime" | "pool" | "red" | "amber" | "muted";

export function TWBadge({
  children,
  tone = "blue",
  style,
}: {
  children: React.ReactNode;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const { palette: p } = useTheme();
  const tones: Record<Tone, { bg: string; fg: string }> = {
    blue: { bg: "rgba(43,15,248,0.12)", fg: colors.brand.friendlyBlue },
    pink: { bg: "rgba(255,0,101,0.12)", fg: colors.brand.trendyPink },
    lime: { bg: "rgba(169,244,83,0.22)", fg: "#4d7a1a" },
    pool: { bg: "rgba(0,199,234,0.16)", fg: colors.brand.poolBlue },
    red: { bg: "rgba(255,0,0,0.12)", fg: colors.brand.ultraRed },
    amber: { bg: "rgba(245,184,0,0.16)", fg: "#8a5a00" },
    muted: { bg: p.cardAlt, fg: p.muted },
  };
  const t = tones[tone];
  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          paddingVertical: 3,
          paddingHorizontal: 8,
          borderRadius: 999,
          backgroundColor: t.bg,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: t.fg }}>{children}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWScreen
// ──────────────────────────────────────────────────────────────────────────

export function TWScreen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const { palette: p } = useTheme();
  return <View style={[{ flex: 1, backgroundColor: p.bg }, style]}>{children}</View>;
}

// ──────────────────────────────────────────────────────────────────────────
// TWAurora — living, flowing backdrop.
// ──────────────────────────────────────────────────────────────────────────
// Soft radial blooms (Friendly Blue + Pool Blue/Pink) that SLOWLY DRIFT like
// aurora / water on an endless sine loop, and PARALLAX with the user's scroll
// (via the shared scrollY from TabBarScrollProvider — null-safe elsewhere).
// Renders in both themes: dark = electric night, light = soft dawn. Non-
// interactive; drop as the first child of a relative container. Respects
// reduced-motion (falls back to a static bloom). Motion is transform-only, so
// it runs on the UI thread and stays cheap on budget devices.

// One drifting bloom. Its own component so each gets an isolated hook set.
function AuroraBloom({
  color,
  size,
  leftPct,
  topPct,
  ampX,
  ampY,
  durationMs,
  parallax,
  scrollY,
  paused,
}: {
  color: string;
  size: number;
  leftPct: number;
  topPct: number;
  ampX: number;
  ampY: number;
  durationMs: number;
  parallax: number;
  scrollY: SharedValue<number> | null;
  paused: boolean;
}): React.JSX.Element {
  const uid = React.useId().replace(/:/g, "");
  const prog = useSharedValue(0.5); // 0.5 = at-rest center

  React.useEffect(() => {
    if (paused) {
      cancelAnimation(prog);
      prog.value = withTiming(0.5, { duration: 600 });
      return;
    }
    prog.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true, // reverse → smooth back-and-forth
    );
    return () => cancelAnimation(prog);
  }, [paused, durationMs, prog]);

  const aStyle = useAnimatedStyle(() => {
    const t = prog.value;
    const sy = scrollY ? scrollY.value : 0;
    // Clamp scroll parallax so a long page never flings the bloom off-canvas.
    const par = Math.max(-80, Math.min(80, sy * parallax));
    return {
      transform: [
        { translateX: (t - 0.5) * ampX },
        { translateY: (t - 0.5) * ampY + par },
        { scale: 0.9 + t * 0.2 },
      ],
      opacity: 0.7 + t * 0.3,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          left: `${leftPct}%` as `${number}%`,
          top: `${topPct}%` as `${number}%`,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        },
        aStyle,
      ]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <SvgRadialGradient id={`bloom${uid}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="0.7" stopColor={color} stopOpacity="0.35" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </SvgRadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#bloom${uid})`} />
      </Svg>
    </Animated.View>
  );
}

export function TWAurora({
  variant = "hero",
  height = 320,
  style,
}: {
  variant?: "hero" | "login" | "ambient";
  height?: number;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const { isDark, palette: p } = useTheme();
  const reduced = useReducedMotion();
  const scrollY = useAuroraScrollY();

  const box: ViewStyle =
    variant === "ambient"
      ? { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }
      : { position: "absolute", top: 0, left: 0, right: 0, height };

  // Login floats the cluster a bit lower so it sits behind the centered form.
  const yShift = variant === "login" ? 16 : 0;
  // Third hue completes a "flow of colors": pink in the dark night, cyan at dawn.
  const third = isDark ? "rgba(255,0,101,0.16)" : "rgba(0,199,234,0.06)";

  return (
    <View pointerEvents="none" style={[box, { overflow: "hidden" }, style]}>
      <AuroraBloom
        color={p.aurora1}
        size={480}
        leftPct={80}
        topPct={12 + yShift}
        ampX={44}
        ampY={34}
        durationMs={12000}
        parallax={-0.08}
        scrollY={scrollY}
        paused={reduced}
      />
      <AuroraBloom
        color={p.aurora2}
        size={440}
        leftPct={12}
        topPct={42 + yShift}
        ampX={38}
        ampY={48}
        durationMs={16000}
        parallax={0.12}
        scrollY={scrollY}
        paused={reduced}
      />
      <AuroraBloom
        color={third}
        size={400}
        leftPct={60}
        topPct={80}
        ampX={32}
        ampY={40}
        durationMs={9500}
        parallax={-0.16}
        scrollY={scrollY}
        paused={reduced}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWGradientHero
// ──────────────────────────────────────────────────────────────────────────

export function TWGradientHero({
  children,
  height = 220,
  radius = 24,
  style,
}: {
  children?: React.ReactNode;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  return (
    <View
      style={[
        {
          height,
          borderRadius: radius,
          overflow: "hidden",
          position: "relative",
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[colors.hero.deep, colors.hero.mid, colors.hero.bright]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWTextInput
// ──────────────────────────────────────────────────────────────────────────

export function TWTextInput(
  props: TextInputProps & { leftIcon?: React.ComponentProps<typeof Ionicons>["name"] },
): React.JSX.Element {
  const { palette: p } = useTheme();
  const { style, leftIcon, ...rest } = props;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 48,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: p.border,
        backgroundColor: p.card,
      }}
    >
      {leftIcon ? <Ionicons name={leftIcon} size={18} color={p.muted} /> : null}
      <TextInput
        {...rest}
        placeholderTextColor={p.muted}
        style={[{ flex: 1, color: p.text, fontSize: 15 }, style as TextStyle]}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWPressable
// ──────────────────────────────────────────────────────────────────────────

export function TWPressable({
  children,
  onPress,
  style,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle> }): React.JSX.Element {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => (scale.value = withTiming(0.96, { duration: 80 }))}
        onPressOut={() => (scale.value = withTiming(1, { duration: 160 }))}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
