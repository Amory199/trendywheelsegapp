// Top of the profile screen — avatar, name, phone, tier pill. Tier-coloured
// gradient background. Tap the whole thing → /profile/edit (the chevron makes
// the affordance obvious without an extra row).

import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as React from "react";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { TWPressable } from "../ui";

export type Tier = "bronze" | "silver" | "gold" | "platinum";

const TIER_COLORS: Record<Tier, [string, string]> = {
  bronze: ["#CD7F32", "#8B5A2B"],
  silver: ["#9E9E9E", "#5E5E5E"],
  gold: ["#F5B800", "#D19500"],
  platinum: [colors.brand.poolBlue, colors.brand.friendlyBlue],
};

interface Props {
  name: string;
  phone: string;
  tier: Tier;
}

export function HeroStrip({ name, phone, tier }: Props): React.JSX.Element {
  const router = useRouter();
  const colorsPair = TIER_COLORS[tier] ?? TIER_COLORS.bronze;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <TWPressable onPress={() => router.push("/profile/edit")}>
      <LinearGradient
        colors={colorsPair}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          marginHorizontal: 16,
          borderRadius: 24,
          paddingVertical: 24,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "rgba(255,255,255,0.22)",
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.65)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontFamily: "Anton", fontSize: 30, letterSpacing: 1 }}>
            {initials || "TW"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: "#fff", fontFamily: "Anton", fontSize: 24, letterSpacing: 0.5 }}
            numberOfLines={1}
          >
            {name || "Welcome"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 }}>
            {phone}
          </Text>
          <View style={{ marginTop: 8 }}>
            <TierShimmerPill tier={tier} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.85)" />
      </LinearGradient>
    </TWPressable>
  );
}

// Subtle shimmer that sweeps left-to-right over the tier pill.
function TierShimmerPill({ tier }: { tier: Tier }): React.JSX.Element {
  const t = useSharedValue(0);
  const [pillW, setPillW] = React.useState(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false,
    );
  }, [t]);
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(t.value, [0, 1], [-pillW, pillW]) }],
  }));
  return (
    <View
      onLayout={(e) => setPillW(e.nativeEvent.layout.width)}
      style={{
        alignSelf: "flex-start",
        backgroundColor: "rgba(255,255,255,0.22)",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 4,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: pillW || 100,
            backgroundColor: "rgba(255,255,255,0.18)",
          },
          shimmerStyle,
        ]}
      />
      <Text
        style={{
          color: "#fff",
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {tier} tier
      </Text>
    </View>
  );
}
