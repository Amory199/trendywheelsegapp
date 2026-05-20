import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as React from "react";
import { useEffect } from "react";
import { Share, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { TWLoyaltyBadge } from "../../components/skia/loyalty-badge";
import { TWBadge, TWButton, TWCard, TWPressable } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useTabBarScrollHandler } from "../../lib/tab-bar-scroll";
import { useTheme } from "../../lib/use-theme";

type Tier = "bronze" | "silver" | "gold" | "platinum";

const TIER_COLORS: Record<string, [string, string]> = {
  bronze: ["#CD7F32", "#8B5A2B"],
  silver: ["#E3E3E3", "#9E9E9E"],
  gold: ["#F5B800", "#D19500"],
  platinum: [colors.brand.poolBlue, colors.brand.friendlyBlue],
};

// Cumulative thresholds for the next tier — pure UI, not from API. If/when
// backend exposes real thresholds, swap this out.
const TIER_NEXT: Record<Tier, { next: Tier | null; at: number }> = {
  bronze: { next: "silver", at: 1000 },
  silver: { next: "gold", at: 5000 },
  gold: { next: "platinum", at: 15000 },
  platinum: { next: null, at: 0 },
};

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const { palette } = useTheme();
  const { user, hydrate, logout, initialized } = useAuth();
  const scrollHandler = useTabBarScrollHandler();

  useEffect(() => {
    if (!initialized) void hydrate();
  }, [initialized, hydrate]);

  const onLogout = async (): Promise<void> => {
    await logout();
    router.replace("/(auth)/phone");
  };

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.bg,
          paddingTop: 80,
          paddingHorizontal: 24,
          alignItems: "center",
        }}
      >
        <Ionicons name="person-circle-outline" size={80} color={palette.muted} />
        <Text style={{ color: palette.muted, fontSize: 16, marginTop: 16, marginBottom: 20 }}>
          Not signed in
        </Text>
        <TWButton kind="pink" size="lg" onPress={() => router.replace("/(auth)/phone")}>
          Sign in
        </TWButton>
      </View>
    );
  }

  const tier = (user.loyaltyTier ?? "bronze") as Tier;
  const tierColors = TIER_COLORS[tier] ?? TIER_COLORS.bronze;
  const points = user.loyaltyPoints ?? 0;
  const tierInfo = TIER_NEXT[tier];
  const progress = tierInfo.next ? Math.min(1, points / tierInfo.at) : 1;
  const pointsToNext = tierInfo.next ? Math.max(0, tierInfo.at - points) : 0;
  const initials = (user.name ?? user.phone ?? "?")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SAFE_BOTTOM }}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
    >
      {/* Header with tier gradient */}
      <Animated.View entering={FadeInDown.duration(420)}>
        <LinearGradient
          colors={tierColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 72, paddingBottom: 72, paddingHorizontal: 24, alignItems: "center" }}
        >
          <AvatarGlow initials={initials} />
          <Text
            style={{
              color: "#fff",
              fontFamily: "Anton",
              fontSize: 26,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginTop: 14,
            }}
          >
            {user.name ?? "TrendyWheels user"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, marginTop: 4 }}>
            {user.phone}
          </Text>
          <TierShimmerPill tier={tier} />
          <TierProgress
            progress={progress}
            label={
              tierInfo.next
                ? `${pointsToNext.toLocaleString()} pts to ${tierInfo.next.toUpperCase()}`
                : "MAX TIER REACHED"
            }
          />
        </LinearGradient>
      </Animated.View>

      {/* Points card (overlapping gradient) */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(420)}
        style={{ paddingHorizontal: 20, marginTop: -32 }}
      >
        <TWCard>
          <View
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <View>
              <Text
                style={{
                  fontSize: 11,
                  color: palette.muted,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                }}
              >
                LOYALTY POINTS
              </Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
                <Text
                  style={{
                    fontFamily: "Anton",
                    fontSize: 36,
                    color: palette.text,
                    marginTop: 2,
                    letterSpacing: 0.3,
                  }}
                >
                  {points.toLocaleString()}
                </Text>
                <Ionicons
                  name="sparkles"
                  size={18}
                  color={colors.brand.trendyPink}
                  style={{ marginBottom: 8 }}
                />
              </View>
              <Text style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>
                {tierInfo.next
                  ? `${pointsToNext.toLocaleString()} more to ${tierInfo.next}`
                  : "You're at the top tier"}
              </Text>
            </View>
            <TWLoyaltyBadge tier={tier as Tier} size={64} />
          </View>
        </TWCard>
      </Animated.View>

      {/* Referral code */}
      <Animated.View
        entering={FadeInDown.delay(110).duration(420)}
        style={{ paddingHorizontal: 20, marginTop: 20 }}
      >
        <ReferralCard />
      </Animated.View>

      {/* My activity */}
      <Animated.View
        entering={FadeInDown.delay(140).duration(420)}
        style={{ paddingHorizontal: 20, marginTop: 20 }}
      >
        <Text
          style={{
            fontSize: 11,
            color: palette.muted,
            fontWeight: "700",
            letterSpacing: 0.8,
            marginBottom: 10,
          }}
        >
          MY ACTIVITY
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <ActivityTile
            icon="calendar"
            label="My bookings"
            tone="blue"
            onPress={() => router.push("/rent/my-bookings")}
          />
          <ActivityTile
            icon="pricetag"
            label="My listings"
            tone="pink"
            onPress={() => router.push("/sell/my-listings")}
          />
          <ActivityTile
            icon="construct"
            label="Repairs"
            tone="amber"
            onPress={() => router.push("/(tabs)/repair")}
          />
          <ActivityTile
            icon="chatbubbles"
            label="Messages"
            tone="pool"
            onPress={() => router.push("/messages")}
          />
        </View>
      </Animated.View>

      {/* Menu */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(420)}
        style={{ paddingHorizontal: 20, marginTop: 20 }}
      >
        <Text
          style={{
            fontSize: 11,
            color: palette.muted,
            fontWeight: "700",
            letterSpacing: 0.8,
            marginBottom: 10,
          }}
        >
          ACCOUNT
        </Text>
        <TWCard padded={false}>
          <MenuRow
            icon="person-outline"
            label="Edit profile"
            onPress={() => router.push("/profile/edit")}
          />
          <MenuRow
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push("/profile/notifications")}
          />
          <MenuRow
            icon="language-outline"
            label="Language"
            value="English"
            onPress={() => router.push("/profile/settings")}
          />
          <MenuRow
            icon="shield-checkmark-outline"
            label="Privacy"
            onPress={() => router.push("/privacy")}
            last
          />
        </TWCard>
      </Animated.View>

      {/* Sign out */}
      <Animated.View
        entering={FadeInDown.delay(260).duration(420)}
        style={{ paddingHorizontal: 20, marginTop: 20 }}
      >
        <TWButton
          kind="outline"
          size="md"
          icon="log-out-outline"
          onPress={() => void onLogout()}
          full
        >
          Sign out
        </TWButton>
      </Animated.View>
    </Animated.ScrollView>
  );
}

function ActivityTile({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  tone: "blue" | "pink" | "amber" | "pool";
  onPress: () => void;
}): React.JSX.Element {
  const { palette } = useTheme();
  const toneMap: Record<typeof tone, string> = {
    blue: colors.brand.friendlyBlue,
    pink: colors.brand.trendyPink,
    amber: "#F5B800",
    pool: colors.brand.poolBlue,
  };
  const color = toneMap[tone];
  return (
    <TWPressable
      onPress={onPress}
      style={{
        flexBasis: "47%",
        flexGrow: 1,
        minWidth: 140,
        backgroundColor: palette.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: palette.border,
        padding: 14,
        gap: 10,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${color}22`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontSize: 14, fontWeight: "700", color: palette.text }}
      >
        {label}
      </Text>
    </TWPressable>
  );
}

function MenuRow({
  icon,
  label,
  value,
  badge,
  onPress,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value?: string;
  badge?: string;
  onPress: () => void;
  last?: boolean;
}): React.JSX.Element {
  const { palette } = useTheme();
  return (
    <TWPressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.hairline,
      }}
    >
      <Ionicons name={icon} size={20} color={palette.muted} />
      <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: palette.text }}>{label}</Text>
      {value ? (
        <Text style={{ fontSize: 13, color: palette.muted, marginRight: 4 }}>{value}</Text>
      ) : null}
      {badge ? <TWBadge tone="pink">{badge}</TWBadge> : null}
      <Ionicons name="chevron-forward" size={16} color={palette.muted} />
    </TWPressable>
  );
}

function ReferralCard(): React.JSX.Element | null {
  const q = useQuery<{
    data: { code: string; usedCount: number; referrals: Array<{ completedAt: string | null }> };
  }>({
    queryKey: ["mobile-referral"],
    queryFn: async () => {
      const baseUrl = (api as unknown as { baseUrl: string }).baseUrl;
      const token = await (
        api as unknown as { config: { getAccessToken: () => Promise<string | null> } }
      ).config.getAccessToken();
      const res = await fetch(`${baseUrl}/api/referrals/me`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) throw new Error("Failed to load referrals");
      return res.json();
    },
  });
  const data = q.data?.data;
  if (!data) return null;

  const completed = data.referrals.filter((r) => r.completedAt).length;

  const onShare = async (): Promise<void> => {
    try {
      await Share.share({
        message: `Join me on TrendyWheels — use my code ${data.code} for a discount on your first ride: https://trendywheelseg.com`,
      });
    } catch {
      // user cancelled or share unavailable
    }
  };

  return (
    <View
      style={{
        borderRadius: 16,
        padding: 18,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={[colors.brand.trendyPink, colors.brand.friendlyBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "800",
              color: "rgba(255,255,255,0.85)",
              letterSpacing: 1.2,
            }}
          >
            REFERRAL CODE
          </Text>
          <Text
            style={{
              fontFamily: "Anton",
              fontSize: 30,
              color: "#fff",
              letterSpacing: 1,
              marginTop: 4,
            }}
          >
            {data.code}
          </Text>
          <Text
            style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 6, lineHeight: 15 }}
          >
            Friends earn 500 pts on first ride. So do you.
          </Text>
          <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: "#fff" }}>
              <Text style={{ fontWeight: "800" }}>{data.usedCount}</Text> joined
            </Text>
            <Text style={{ fontSize: 11, color: "#fff" }}>
              <Text style={{ fontWeight: "800" }}>{completed}</Text> completed
            </Text>
          </View>
        </View>
        <TWPressable
          onPress={onShare}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: "rgba(255,255,255,0.18)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.35)",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 }}>
            SHARE
          </Text>
        </TWPressable>
      </View>
    </View>
  );
}

// Pulsing ring around the avatar. Uses opacity + scale on a duplicated border
// ring so we don't have to animate the avatar's actual borderWidth (which
// re-layouts every frame on Android).
function AvatarGlow({ initials }: { initials: string }): React.JSX.Element {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.85]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08]) }],
  }));
  return (
    <View style={{ width: 100, height: 100, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.7)",
          },
          ringStyle,
        ]}
      />
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          backgroundColor: "rgba(255,255,255,0.2)",
          borderWidth: 3,
          borderColor: "rgba(255,255,255,0.6)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontFamily: "Anton", fontSize: 36, letterSpacing: 1 }}>
          {initials}
        </Text>
      </View>
    </View>
  );
}

// Tier pill with a subtle gradient shimmer that sweeps left-to-right every few
// seconds. The shimmer is an absolute LinearGradient overlay translated by a
// shared value.
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
  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(t.value, [0, 1], [-pillW, pillW], "clamp") }],
  }));
  return (
    <View
      onLayout={(e) => setPillW(e.nativeEvent.layout.width)}
      style={{
        marginTop: 14,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.2)",
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[{ position: "absolute", top: 0, bottom: 0, width: pillW }, sweep]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
        {tier.toUpperCase()} MEMBER
      </Text>
    </View>
  );
}

// Tier progress bar shown inside the gradient hero. Fills to `progress` (0–1).
function TierProgress({ progress, label }: { progress: number; label: string }): React.JSX.Element {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(progress, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress, fill]);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(fill.value * 100)}%`,
  }));
  return (
    <View style={{ width: "100%", maxWidth: 240, marginTop: 14 }}>
      <View
        style={{
          height: 6,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.18)",
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={[
            { height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.9)" },
            fillStyle,
          ]}
        />
      </View>
      <Text
        style={{
          color: "rgba(255,255,255,0.82)",
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.8,
          marginTop: 6,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
