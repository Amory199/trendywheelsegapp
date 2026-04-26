import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { Vehicle } from "@trendywheels/types";
import { colors, twEGP } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import {
  TWBadge,
  TWButton,
  TWCard,
  TWGradientHero,
  TWPressable,
  palette,
} from "../../components/ui";

const QUICK_ACTIONS = [
  { label: "Rent a car", icon: "car" as const, href: "/rent" as const, tone: "blue" as const },
  { label: "Sell my car", icon: "pricetag" as const, href: "/sell" as const, tone: "pink" as const },
  { label: "Book repair", icon: "construct" as const, href: "/repair" as const, tone: "lime" as const },
  { label: "My bookings", icon: "calendar" as const, href: "/rent/my-bookings" as const, tone: "pool" as const },
];

const TONE_COLORS: Record<"blue" | "pink" | "lime" | "pool", string> = {
  blue: colors.brand.friendlyBlue,
  pink: colors.brand.trendyPink,
  lime: colors.brand.ecoLimelight,
  pool: colors.brand.poolBlue,
};

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const featuredQ = useQuery({
    queryKey: ["vehicles", "featured"],
    queryFn: () => api.getVehicles({ page: 1, limit: 6 }),
  });

  const featured = featuredQ.data?.data ?? [];
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: 56, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "700", letterSpacing: 0.8 }}>
            WELCOME BACK
          </Text>
          <Text
            style={{
              fontFamily: "Anton",
              fontSize: 30,
              color: palette.text,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginTop: 4,
            }}
          >
            Hey, {firstName} 👋
          </Text>
        </View>

        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(50).duration(420)} style={{ paddingHorizontal: 20 }}>
          <TWGradientHero height={180}>
            <View style={{ flex: 1, padding: 22, justifyContent: "space-between" }}>
              <View>
                <Text
                  style={{
                    fontFamily: "Anton",
                    fontSize: 28,
                    color: "#fff",
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                    lineHeight: 30,
                  }}
                >
                  Rent your{"\n"}
                  <Text style={{ color: colors.brand.trendyPink }}>next ride.</Text>
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 8 }}>
                  Hourly or daily, across Egypt.
                </Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                <TWButton kind="pink" size="sm" icon="arrow-forward" iconRight onPress={() => router.push("/rent")}>
                  Book a car
                </TWButton>
              </View>
            </View>
          </TWGradientHero>
        </Animated.View>

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={{ ...captionStyle, marginBottom: 10 }}>QUICK ACTIONS</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {QUICK_ACTIONS.map((a, i) => (
              <Animated.View
                key={a.label}
                entering={FadeInDown.delay(100 + i * 50).duration(420)}
                style={{ width: "47%" }}
              >
                <TWPressable
                  onPress={() => router.push(a.href as never)}
                  style={{
                    backgroundColor: palette.card,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: palette.border,
                    padding: 16,
                    gap: 12,
                    minHeight: 96,
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: `${TONE_COLORS[a.tone]}22`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={a.icon} size={18} color={TONE_COLORS[a.tone]} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: palette.text }}>{a.label}</Text>
                </TWPressable>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Featured vehicles */}
        <View style={{ marginTop: 24 }}>
          <View
            style={{
              paddingHorizontal: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text style={captionStyle}>FEATURED VEHICLES</Text>
            <TWPressable onPress={() => router.push("/rent")}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.brand.friendlyBlue }}>
                See all →
              </Text>
            </TWPressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {featured.map((v: Vehicle, i) => (
              <Animated.View
                key={v.id}
                entering={FadeInDown.delay(200 + i * 60).duration(420)}
              >
                <TWPressable
                  onPress={() => router.push(`/rent/${v.id}`)}
                  style={{
                    width: 240,
                    backgroundColor: palette.card,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: palette.border,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    source={{
                      uri:
                        (v.images as string[] | undefined)?.[0] ??
                        "https://placehold.co/480x270/2B0FF8/FFFFFF",
                    }}
                    style={{ width: "100%", aspectRatio: 16 / 9 }}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={{ padding: 12 }}>
                    <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "700", color: palette.text }}>
                      {v.name}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                      <Text style={{ color: colors.brand.trendyPink, fontWeight: "700" }}>
                        {twEGP(Number(v.dailyRate))}/day
                      </Text>
                      <TWBadge tone={v.status === "available" ? "lime" : "muted"}>
                        {v.status === "available" ? "Available" : v.status}
                      </TWBadge>
                    </View>
                  </View>
                </TWPressable>
              </Animated.View>
            ))}
            {featuredQ.isLoading
              ? [1, 2, 3].map((i) => (
                  <View
                    key={`sk-${i}`}
                    style={{
                      width: 240,
                      height: 200,
                      borderRadius: 14,
                      backgroundColor: palette.cardAlt,
                    }}
                  />
                ))
              : null}
          </ScrollView>
        </View>

        {/* Loyalty teaser */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <TWCard>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "rgba(255,0,101,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="star" size={22} color={colors.brand.trendyPink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: palette.text }}>
                  Earn with every ride
                </Text>
                <Text style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>
                  Unlock discounts and priority support.
                </Text>
              </View>
              <TWButton kind="outline" size="sm" onPress={() => router.push("/profile")}>
                View
              </TWButton>
            </View>
          </TWCard>
        </View>
      </ScrollView>
    </View>
  );
}

const captionStyle = {
  fontSize: 11,
  fontWeight: "700" as const,
  color: palette.muted,
  letterSpacing: 0.8,
};
