import { Ionicons } from "@expo/vector-icons";
import { colors, twPalette } from "@trendywheels/ui-tokens";
import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export const palette = twPalette(false);
export const darkPalette = twPalette(true);

// ──────────────────────────────────────────────────────────────────────────
// Typography — single source for headline vs body, mirrored on ui-tokens.
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
  return (
    <View
      style={[
        {
          backgroundColor: palette.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: palette.border,
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
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const base = {
    sm: { paddingVertical: 8, paddingHorizontal: 14, fontSize: 13 },
    md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 14 },
    lg: { paddingVertical: 16, paddingHorizontal: 24, fontSize: 16 },
  }[size];

  const palette_ = {
    pink: {
      bg: colors.brand.trendyPink,
      fg: "#FFFFFF",
      border: "transparent",
    },
    blue: {
      bg: colors.brand.friendlyBlue,
      fg: "#FFFFFF",
      border: "transparent",
    },
    outline: {
      bg: "transparent",
      fg: palette.text,
      border: palette.border,
    },
    ghost: {
      bg: "transparent",
      fg: palette.text,
      border: "transparent",
    },
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
            backgroundColor: palette_.bg,
            borderWidth: kind === "outline" ? 1 : 0,
            borderColor: palette_.border,
            borderRadius: 12,
            paddingVertical: base.paddingVertical,
            paddingHorizontal: base.paddingHorizontal,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        {icon ? <Ionicons name={icon} size={base.fontSize + 3} color={palette_.fg} /> : null}
        {children != null ? (
          <Text style={{ color: palette_.fg, fontSize: base.fontSize, fontWeight: "700" }}>
            {children}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWChip — filter / tag with optional active state.
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
        backgroundColor: active ? colors.brand.trendyPink : palette.cardAlt,
        borderWidth: 1,
        borderColor: active ? colors.brand.trendyPink : palette.border,
      }}
    >
      {icon ? (
        <Ionicons name={icon} size={12} color={active ? "#fff" : palette.muted} />
      ) : null}
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: active ? "#fff" : palette.text,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWBadge — colored pill for statuses.
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
  const tones: Record<Tone, { bg: string; fg: string }> = {
    blue: { bg: "rgba(43,15,248,0.1)", fg: colors.brand.friendlyBlue },
    pink: { bg: "rgba(255,0,101,0.1)", fg: colors.brand.trendyPink },
    lime: { bg: "rgba(169,244,83,0.2)", fg: "#4d7a1a" },
    pool: { bg: "rgba(0,199,234,0.15)", fg: colors.brand.poolBlue },
    red: { bg: "rgba(255,0,0,0.1)", fg: colors.brand.ultraRed },
    amber: { bg: "rgba(245,184,0,0.15)", fg: "#8a5a00" },
    muted: { bg: palette.cardAlt, fg: palette.muted },
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
// TWScreen — screen wrapper with brand bg + status bar padding.
// ──────────────────────────────────────────────────────────────────────────

export function TWScreen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  return (
    <View style={[{ flex: 1, backgroundColor: palette.bg }, style]}>{children}</View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWGradientHero — blue→navy gradient block with optional pink radial accent.
// Used on onboarding illustrations + home hero.
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
        colors={[colors.brand.friendlyBlue, "#1E1B4B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWTextInput — minimal brand-aligned input.
// ──────────────────────────────────────────────────────────────────────────

import { TextInput, type TextInputProps } from "react-native";

export function TWTextInput(
  props: TextInputProps & { leftIcon?: React.ComponentProps<typeof Ionicons>["name"] },
): React.JSX.Element {
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
        borderColor: palette.border,
        backgroundColor: palette.card,
      }}
    >
      {leftIcon ? <Ionicons name={leftIcon} size={18} color={palette.muted} /> : null}
      <TextInput
        {...rest}
        placeholderTextColor={palette.muted}
        style={[{ flex: 1, color: palette.text, fontSize: 15 }, style as TextStyle]}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TWPressable — any tappable with built-in scale-feedback animation.
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
