// Loyalty card — TWLoyaltyBadge (Skia) on the left, points + progress bar +
// "{n} more to {tier}" hint on the right. Same threshold table as the legacy
// inline implementation (bronze→1000, silver→5000, gold→15000).

import * as React from "react";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../../lib/use-theme";
import { TWLoyaltyBadge } from "../skia/loyalty-badge";

import type { Tier } from "./HeroStrip";

const TIER_NEXT: Record<Tier, { next: Tier | null; at: number }> = {
  bronze: { next: "silver", at: 1000 },
  silver: { next: "gold", at: 5000 },
  gold: { next: "platinum", at: 15000 },
  platinum: { next: null, at: 0 },
};

interface Props {
  tier: Tier;
  points: number;
}

export function LoyaltyCard({ tier, points }: Props): React.JSX.Element {
  const { palette } = useTheme();
  const { next, at } = TIER_NEXT[tier];
  const progress = next ? Math.min(1, points / at) : 1;
  const remaining = next ? Math.max(0, at - points) : 0;

  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(progress, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [progress, width]);
  const barStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: palette.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <TWLoyaltyBadge tier={tier} size={64} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.text, fontFamily: "Anton", fontSize: 30 }}>
          {points.toLocaleString()}
        </Text>
        <Text
          style={{
            color: palette.muted,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginTop: -2,
          }}
        >
          Loyalty points
        </Text>
        <View
          style={{
            marginTop: 10,
            height: 8,
            borderRadius: 4,
            backgroundColor: palette.border,
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={[{ height: "100%", backgroundColor: "#F5B800", borderRadius: 4 }, barStyle]}
          />
        </View>
        <Text style={{ color: palette.muted, fontSize: 12, marginTop: 6 }}>
          {next ? `${remaining.toLocaleString()} pts to ${next}` : "Top tier — you've maxed out 🏆"}
        </Text>
      </View>
    </View>
  );
}
