import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, twEGP } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Dimensions, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

import { ErrorState } from "../../components/ErrorState";
import { ImageCarousel } from "../../components/ImageCarousel";
import { TWBadge, TWButton, TWCard, TWChip, TWPressable } from "../../components/ui";
import { logEvent } from "../../lib/analytics";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { ensureId } from "../../lib/require-id";
import { useDisplay, useTracking } from "../../lib/typography";
import { useTheme } from "../../lib/use-theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 320;

type FavoritesResponse = Awaited<ReturnType<typeof api.getFavorites>>;

export default function RentDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollY = useSharedValue(0);
  const { palette } = useTheme();
  const t = useT();
  const display = useDisplay();
  const track = useTracking();

  const q = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => api.getVehicle(id as string),
    enabled: Boolean(id),
  });

  const user = useAuth((s) => s.user);
  const qc = useQueryClient();

  const favoritesQ = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.getFavorites(),
    enabled: Boolean(user),
  });
  const isFavorite = (favoritesQ.data?.data ?? []).some((f) => f.vehicleId === id);

  const favoriteMutation = useMutation({
    mutationFn: async (next: boolean): Promise<unknown> =>
      next ? api.addFavorite(id as string) : api.removeFavorite(id as string),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["favorites"] });
      const prev = qc.getQueryData<FavoritesResponse>(["favorites"]);
      qc.setQueryData<FavoritesResponse>(["favorites"], (old) => {
        const rows = old?.data ?? [];
        return {
          data: next
            ? [
                {
                  id: `optimistic-${String(id)}`,
                  vehicleId: id as string,
                  createdAt: new Date().toISOString(),
                  vehicle: q.data?.data as FavoritesResponse["data"][number]["vehicle"],
                },
                ...rows,
              ]
            : rows.filter((f) => f.vehicleId !== id),
        };
      });
      return { prev };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(["favorites"], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const onToggleFavorite = (): void => {
    if (!user) {
      router.push("/(auth)/phone");
      return;
    }
    const next = !isFavorite;
    favoriteMutation.mutate(next);
    logEvent(next ? "favorite_added" : "favorite_removed", { vehicle_id: id });
  };

  const reviewsQ = useQuery({
    queryKey: ["vehicle-reviews", id],
    queryFn: () => api.getVehicleReviews(id as string),
    enabled: Boolean(id),
  });

  const vehicle = q.data?.data;

  // A for-sale-only vehicle must never render the rental (per-day) screen —
  // bounce it to the sale detail so it shows the sale price, not a daily rate.
  React.useEffect(() => {
    if (vehicle && vehicle.listingType === "sale") {
      router.replace(`/sale/${vehicle.id}` as never);
    }
  }, [vehicle, router]);

  // API returns image rows ({ url, sortOrder }); tolerate legacy string[]
  // payloads from older caches so the hero never silently falls back.
  const rawImages = (vehicle?.images ?? []) as Array<string | { url: string }>;
  const imageUrls = rawImages
    .map((img) => (typeof img === "string" ? img : img?.url))
    .filter((u): u is string => Boolean(u));

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Hero lives INSIDE the scroll content (it must own horizontal swipes for
  // the photo carousel — an absolute hero under the ScrollView never receives
  // touches). Parallax: drift down at half scroll speed; stretch on pull-down.
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, HERO_HEIGHT],
          [0, HERO_HEIGHT / 2],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(scrollY.value, [-HERO_HEIGHT, 0], [1.4, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  if (q.isError) {
    return <ErrorState onRetry={() => void q.refetch()} />;
  }

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
  const features = (vehicle.features as string[] | undefined) ?? [];
  const reviews = reviewsQ.data?.data ?? [];
  const reviewSummary = reviewsQ.data?.summary;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
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
          onPress={onToggleFavorite}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: "rgba(255,255,255,0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={22}
            color={colors.brand.trendyPink}
          />
        </TWPressable>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[{ height: HERO_HEIGHT, marginBottom: -30 }, heroStyle]}>
          <ImageCarousel urls={imageUrls} width={SCREEN_WIDTH} height={HERO_HEIGHT} />
          {/* pointerEvents none — the gradient must not swallow carousel swipes */}
          <LinearGradient
            colors={["rgba(0,0,0,0.3)", "transparent", "rgba(2,1,31,0.6)"]}
            locations={[0, 0.4, 1]}
            pointerEvents="none"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </Animated.View>
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
              {vehicle.status === "available" ? t("rent.availableNow") : vehicle.status}
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
                  style={[
                    {
                      fontSize: 28,
                      color: palette.text,
                      textTransform: "uppercase",
                      lineHeight: 30,
                    },
                    display(0.3),
                  ]}
                >
                  {vehicle.name}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <Ionicons name="star" size={14} color="#F5B800" />
                  <Text style={{ fontSize: 13, color: palette.text, fontWeight: "700" }}>
                    {rating}
                  </Text>
                  <Text style={{ fontSize: 13, color: palette.muted }}>
                    ({reviewsCount} {t("rent.reviewsCountSuffix")})
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 20, color: colors.brand.trendyPink, fontWeight: "800" }}>
                  {twEGP(Number(vehicle.dailyRate))}
                </Text>
                <Text style={{ fontSize: 12, color: palette.muted }}>{t("rent.perDay")}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(420)}>
            <TWCard padded={false}>
              <View style={{ flexDirection: "row", padding: 14 }}>
                <SpecCell
                  icon="person"
                  label={t("rent.specSeats")}
                  value={String(vehicle.seating)}
                />
                <SpecCell
                  icon="cog-outline"
                  label={t("rent.specDrive")}
                  value={vehicle.transmission}
                />
                <SpecCell
                  icon="water-outline"
                  label={t("rent.specFuel")}
                  value={vehicle.fuelType ?? t("rent.fuelPetrol")}
                />
                <SpecCell
                  icon="location-outline"
                  label={t("rent.specCity")}
                  value={vehicle.location}
                  last
                />
              </View>
            </TWCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(420)}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: palette.muted,
                letterSpacing: track(0.8),
                marginBottom: 8,
              }}
            >
              {t("rent.aboutVehicle").toUpperCase()}
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 22, color: palette.text }}>
              {t("rent.aboutVehicleBody")}
            </Text>
          </Animated.View>

          {features.length > 0 && (
            <Animated.View entering={FadeInDown.delay(260).duration(420)}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: palette.muted,
                  letterSpacing: track(0.8),
                  marginBottom: 10,
                }}
              >
                {t("rent.features").toUpperCase()}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {features.map((f) => (
                  <TWChip key={f}>{f}</TWChip>
                ))}
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(320).duration(420)}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: palette.muted,
                  letterSpacing: track(0.8),
                }}
              >
                {t("rent.recentReviews").toUpperCase()}
              </Text>
              {reviewSummary && reviewSummary.count > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="star" size={12} color="#F5B800" />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: palette.text }}>
                    {Number(reviewSummary.average).toFixed(1)}
                  </Text>
                  <Text style={{ fontSize: 12, color: palette.muted }}>
                    · {reviewSummary.count}
                  </Text>
                </View>
              )}
            </View>
            {reviews.length === 0 ? (
              <TWCard>
                <Text style={{ fontSize: 13, color: palette.muted, lineHeight: 18 }}>
                  {t("rent.noReviewsYet")}
                </Text>
              </TWCard>
            ) : (
              <View style={{ gap: 10 }}>
                {reviews.slice(0, 3).map((r) => (
                  <TWCard key={r.id}>
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
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>
                          {initialsOf(r.user?.name ?? null)}
                        </Text>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "700",
                              color: palette.text,
                              flexShrink: 1,
                            }}
                            numberOfLines={1}
                          >
                            {r.user?.name ?? t("rent.defaultRiderName")}
                          </Text>
                          <View style={{ flexDirection: "row", gap: 1 }}>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Ionicons
                                key={i}
                                name={i <= r.rating ? "star" : "star-outline"}
                                size={10}
                                color="#F5B800"
                              />
                            ))}
                          </View>
                          <Text style={{ fontSize: 11, color: palette.muted, marginLeft: "auto" }}>
                            {new Date(r.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                        {r.title ? (
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: palette.text,
                              marginTop: 4,
                            }}
                          >
                            {r.title}
                          </Text>
                        ) : null}
                        {r.body ? (
                          <Text
                            style={{
                              fontSize: 13,
                              color: palette.muted,
                              marginTop: r.title ? 2 : 4,
                              lineHeight: 18,
                            }}
                          >
                            {r.body}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </TWCard>
                ))}
              </View>
            )}
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
            style={{
              fontSize: 11,
              color: palette.muted,
              fontWeight: "700",
              letterSpacing: track(0.5),
            }}
          >
            {t("rent.total").toUpperCase()}
          </Text>
          <Text style={{ fontSize: 18, color: colors.brand.trendyPink, fontWeight: "800" }}>
            {twEGP(Number(vehicle.dailyRate))}
            <Text style={{ fontSize: 12, color: palette.muted, fontWeight: "500" }}>
              {" "}
              {t("rent.perDayShort")}
            </Text>
          </Text>
        </View>
        <TWButton
          kind="pink"
          size="lg"
          icon="arrow-forward"
          iconRight
          onPress={() => {
            const u = useAuth.getState().user;
            const bookParams = {
              vehicleId: vehicle.id,
              dailyRate: String(vehicle.dailyRate),
              name: vehicle.name,
            };
            // Every transaction requires the customer's ID on file first.
            if (!ensureId(u, router, `/rent/${vehicle.id}`)) return;
            if (!u?.licenseNumber) {
              router.push({
                pathname: "/profile/license",
                params: { next: "/rent/book", ...bookParams },
              });
            } else {
              router.push({ pathname: "/rent/book", params: bookParams });
            }
          }}
          style={{ paddingHorizontal: 28 }}
        >
          {t("rent.bookNow")}
        </TWButton>
      </View>
    </View>
  );
}

function initialsOf(name: string | null): string {
  if (!name) return "TW";
  const parts = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "");
  return parts.join("") || "TW";
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
  const { palette: p } = useTheme();
  const track = useTracking();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        borderRightWidth: last ? 0 : 1,
        borderRightColor: p.hairline,
        gap: 4,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.brand.friendlyBlue} />
      <Text style={{ fontSize: 13, fontWeight: "700", color: p.text }}>{value}</Text>
      <Text style={{ fontSize: 10, color: p.muted, fontWeight: "600", letterSpacing: track(0.4) }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
