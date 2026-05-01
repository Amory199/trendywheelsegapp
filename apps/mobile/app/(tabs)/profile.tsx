import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as React from "react";
import { useEffect } from "react";
import { Share, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { TWBadge, TWButton, TWCard, TWPressable, palette } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

const TIER_COLORS: Record<string, [string, string]> = {
  bronze: ["#CD7F32", "#8B5A2B"],
  silver: ["#E3E3E3", "#9E9E9E"],
  gold: ["#F5B800", "#D19500"],
  platinum: [colors.brand.poolBlue, colors.brand.friendlyBlue],
};

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const { user, hydrate, logout, initialized } = useAuth();

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

  const tier = user.loyaltyTier ?? "bronze";
  const tierColors = TIER_COLORS[tier] ?? TIER_COLORS.bronze;
  const initials = (user.name ?? user.phone ?? "?")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Header with tier gradient */}
      <Animated.View entering={FadeInDown.duration(420)}>
        <LinearGradient
          colors={tierColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 72, paddingBottom: 72, paddingHorizontal: 24, alignItems: "center" }}
        >
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
          <View
            style={{
              marginTop: 14,
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
              {tier.toUpperCase()} MEMBER
            </Text>
          </View>
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
              <Text
                style={{
                  fontFamily: "Anton",
                  fontSize: 36,
                  color: palette.text,
                  marginTop: 2,
                  letterSpacing: 0.3,
                }}
              >
                {(user.loyaltyPoints ?? 0).toLocaleString()}
              </Text>
              <Text style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>
                250 more to unlock next tier
              </Text>
            </View>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: `${colors.brand.trendyPink}1A`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="star" size={26} color={colors.brand.trendyPink} />
            </View>
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
            badge="3"
            onPress={() => router.push("/profile/settings")}
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
    </ScrollView>
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
        width: "47%",
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
      <Text style={{ fontSize: 14, fontWeight: "700", color: palette.text }}>{label}</Text>
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
