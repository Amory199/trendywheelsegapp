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
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useTheme } from "../lib/use-theme";

// Frozen palettes kept for legacy module-level styles. Prefer useTheme() in
// new code so screens respond to the user's theme toggle.
export const palette: Palette = twPalette(true);
export const darkPalette: Palette = twPalette(true);
export const lightPalette: Palette = twPalette(false);

// ──────────────────────────────────────────────────────────────────────────
// Typography
// ──────────────────────────────────────────────────────────────────────────

export const typo = StyleSheet.create({
  display: {
    fontFamily: "Anton",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: palette.text,
  },
  h1: { fontSize: 32, lineHeight: 34, fontFamily: "Anton", color: palette.text },
  h2: { fontSize: 24, lineHeight: 26, fontFamily: "Anton", color: palette.text },
  body: { fontSize: 14, color: palette.text },
  bodyMuted: { fontSize: 14, color: palette.muted },
  caption: { fontSize: 11, color: palette.muted, fontWeight: "700", letterSpacing: 0.5 },
  mono: { fontFamily: "ui-monospace" as never, fontSize: 11 },
});

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
  const { palette: p } = useTheme();
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
        style,
      ]}
    >
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

  return (
    <Animated.View style={[animatedStyle, full ? { alignSelf: "stretch" } : null]}>
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
            backgroundColor: tone.bg,
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
