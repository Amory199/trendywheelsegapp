import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, twEGP } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Dimensions, ScrollView, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

import { api } from "../../lib/api";
import { TWBadge, TWButton, TWCard, TWChip, TWPressable, palette } from "../../components/ui";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 320;

const FEATURES = ["Air conditioning", "Bluetooth", "GPS", "USB charging", "Child seat"] as const;

export default function RentDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollY = useSharedValue(0);

  const q = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => api.getVehicle(id as string),
    enabled: Boolean(id),
  });

  const vehicle = q.data?.data;
  const images = (vehicle?.images as string[] | undefined) ?? [
    "https://placehold.co/800x600/2B0FF8/FFFFFF?text=TrendyWheels",
  ];

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, HERO_HEIGHT],
          [0, -HERO_HEIGHT / 2],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(scrollY.value, [-HERO_HEIGHT, 0], [1.4, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  if (q.isLoading || !vehicle) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.brand.friendlyBlue} size="large" />
      </View>
    );
  }

  const rating = Number(vehicle.averageRating ?? 0) || 0;
  const reviewsCount = Number((vehicle as { reviewCount?: number }).reviewCount ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <Animated.View
        style={[
          { height: HERO_HEIGHT, position: "absolute", top: 0, left: 0, right: 0 },
          heroStyle,
        ]}
      >
        <Image
          source={{ uri: images[0] }}
          style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}
          contentFit="cover"
          transition={300}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.3)", "transparent", "rgba(2,1,31,0.6)"]}
          locations={[0, 0.4, 1]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </Animated.View>

      <View
        style={{
          position: "absolute",
          top: 56,
          left: 20,
          right: 20,
          zIndex: 10,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <TWPressable
          onPress={() => router.back()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: "rgba(255,255,255,0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </TWPressable>
        <TWPressable
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: "rgba(255,255,255,0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="heart-outline" size={22} color={colors.brand.trendyPink} />
        </TWPressable>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HERO_HEIGHT - 30, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: palette.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 22,
            gap: 18,
          }}
        >
          <Animated.View entering={FadeInDown.delay(80).duration(420)}>
            <TWBadge tone={vehicle.status === "available" ? "lime" : "muted"}>
              {vehicle.status === "available" ? "Available now" : vehicle.status}
            </TWBadge>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginTop: 10,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={{
                    fontFamily: "Anton",
                    fontSize: 28,
                    color: palette.text,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                    lineHeight: 30,
                  }}
                >
                  {vehicle.name}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <Ionicons name="star" size={14} color="#F5B800" />
                  <Text style={{ fontSize: 13, color: palette.text, fontWeight: "700" }}>
                    {rating}
                  </Text>
                  <Text style={{ fontSize: 13, color: palette.muted }}>
                    ({reviewsCount} reviews)
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 20, color: colors.brand.trendyPink, fontWeight: "800" }}>
                  {twEGP(Number(vehicle.dailyRate))}
                </Text>
                <Text style={{ fontSize: 12, color: palette.muted }}>per day</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(420)}>
            <TWCard padded={false}>
              <View style={{ flexDirection: "row", padding: 14 }}>
                <SpecCell icon="person" label="Seats" value={String(vehicle.seating)} />
                <SpecCell icon="cog-outline" label="Drive" value={vehicle.transmission} />
                <SpecCell icon="water-outline" label="Fuel" value={vehicle.fuelType ?? "Petrol"} />
                <SpecCell icon="location-outline" label="City" value={vehicle.location} last />
              </View>
            </TWCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(420)}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: palette.muted,
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              ABOUT THIS VEHICLE
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 22, color: palette.text }}>
              Premium vehicle in perfect condition. Ideal for city driving and long trips. Insurance
              included, delivery available within 24 hours.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(260).duration(420)}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: palette.muted,
                letterSpacing: 0.8,
                marginBottom: 10,
              }}
            >
              FEATURES
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {FEATURES.map((f) => (
                <TWChip key={f}>{f}</TWChip>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).duration(420)}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: palette.muted,
                letterSpacing: 0.8,
                marginBottom: 10,
              }}
            >
              RECENT REVIEWS
            </Text>
            <TWCard>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <LinearGradient
                  colors={[colors.brand.trendyPink, colors.brand.friendlyBlue]}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>LH</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: palette.text }}>
                      Layla H.
                    </Text>
                    <View style={{ flexDirection: "row", gap: 1 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons key={i} name="star" size={10} color="#F5B800" />
                      ))}
                    </View>
                  </View>
                  <Text
                    style={{ fontSize: 13, color: palette.muted, marginTop: 4, lineHeight: 18 }}
                  >
                    Smooth pickup, car was spotless. Would rent again.
                  </Text>
                </View>
              </View>
            </TWCard>
          </Animated.View>
        </View>
      </Animated.ScrollView>

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: 32,
          backgroundColor: palette.card,
          borderTopWidth: 1,
          borderTopColor: palette.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 11, color: palette.muted, fontWeight: "700", letterSpacing: 0.5 }}
          >
            TOTAL
          </Text>
          <Text style={{ fontSize: 18, color: colors.brand.trendyPink, fontWeight: "800" }}>
            {twEGP(Number(vehicle.dailyRate))}
            <Text style={{ fontSize: 12, color: palette.muted, fontWeight: "500" }}> / day</Text>
          </Text>
        </View>
        <TWButton
          kind="pink"
          size="lg"
          icon="arrow-forward"
          iconRight
          onPress={() =>
            router.push({
              pathname: "/rent/book",
              params: {
                vehicleId: vehicle.id,
                dailyRate: String(vehicle.dailyRate),
                name: vehicle.name,
              },
            })
          }
          style={{ paddingHorizontal: 28 }}
        >
          Book now
        </TWButton>
      </View>
    </View>
  );
}

function SpecCell({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  last?: boolean;
}): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        borderRightWidth: last ? 0 : 1,
        borderRightColor: palette.hairline,
        gap: 4,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.brand.friendlyBlue} />
      <Text style={{ fontSize: 13, fontWeight: "700", color: palette.text }}>{value}</Text>
      <Text style={{ fontSize: 10, color: palette.muted, fontWeight: "600", letterSpacing: 0.4 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
