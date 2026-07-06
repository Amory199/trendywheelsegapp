import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { discountPercent, isVehicleOnSale } from "@trendywheels/types";
import { colors, twEGP } from "@trendywheels/ui-tokens";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Dimensions, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ErrorState } from "../../components/ErrorState";
import { ImageCarousel } from "../../components/ImageCarousel";
import { LockedDetails } from "../../components/LockedDetails";
import { PriceGate } from "../../components/PriceGate";
import { ShareButton } from "../../components/ShareButton";
import { TWBadge, TWButton, TWCard, TWChip, TWPressable } from "../../components/ui";
import { logEvent } from "../../lib/analytics";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { useDisplay, useTracking } from "../../lib/typography";
import { useTheme } from "../../lib/use-theme";

type FavoritesResponse = Awaited<ReturnType<typeof api.getFavorites>>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 320;

// Detail screen for a FOR-SALE vehicle (listingType sale/both). Unlike the
// rental screen it never shows a daily rate or "per day" — it shows the sale
// price (with the original struck through when discounted) and a Reserve/Buy
// CTA that creates a Reservation. The ID-verification gate wraps the CTA.
export default function SaleDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { palette } = useTheme();
  const t = useT();
  const display = useDisplay();
  const track = useTracking();
  const user = useAuth((s) => s.user);

  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => api.getVehicle(id as string),
    enabled: Boolean(id),
  });

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

  const vehicle = q.data?.data;
  const rawImages = (vehicle?.images ?? []) as Array<string | { url: string }>;
  const imageUrls = rawImages
    .map((img) => (typeof img === "string" ? img : img?.url))
    .filter((u): u is string => Boolean(u));

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

  const sale = vehicle.salePrice != null ? Number(vehicle.salePrice) : 0;
  const original = vehicle.originalPriceEgp != null ? Number(vehicle.originalPriceEgp) : null;
  // Shared sale/discount math (@trendywheels/types) — same rule as the home rail.
  const hasDiscount = isVehicleOnSale(vehicle);
  const discountPct = discountPercent(vehicle);
  const features = (vehicle.features as string[] | undefined) ?? [];

  const onReserve = (): void => {
    if (!user) {
      router.push("/(auth)/phone");
      return;
    }
    // Hand off to the guided checkout (ID → fulfillment → location → confirm).
    router.push({
      pathname: "/checkout",
      params: { kind: "reserve", id: String(id), title: vehicle.name, price: String(sale) },
    });
  };

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
        <View style={{ flexDirection: "row", gap: 10 }}>
          <ShareButton
            kind="sale"
            id={vehicle.id}
            title={vehicle.name}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "rgba(255,255,255,0.9)",
              alignItems: "center",
              justifyContent: "center",
            }}
            iconColor={palette.text}
          />
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
      </View>

      <Animated.ScrollView
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: HERO_HEIGHT, marginBottom: -30 }}>
          <ImageCarousel urls={imageUrls} width={SCREEN_WIDTH} height={HERO_HEIGHT} />
          <LinearGradient
            colors={["rgba(0,0,0,0.3)", "transparent", "rgba(2,1,31,0.6)"]}
            locations={[0, 0.4, 1]}
            pointerEvents="none"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </View>

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
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TWBadge tone="pink">{t("sale.forSale")}</TWBadge>
              {hasDiscount ? <TWBadge tone="lime">{`-${discountPct}%`}</TWBadge> : null}
            </View>
            <Text
              style={[
                {
                  fontSize: 28,
                  color: palette.text,
                  textTransform: "uppercase",
                  lineHeight: 30,
                  marginTop: 10,
                },
                display(0.3),
              ]}
            >
              {vehicle.name}
            </Text>
            <View style={{ marginTop: 10 }}>
              <PriceGate size="lg">
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
                  <Text style={{ fontSize: 26, color: colors.brand.trendyPink, fontWeight: "800" }}>
                    {twEGP(sale)}
                  </Text>
                  {hasDiscount ? (
                    <Text
                      style={{
                        fontSize: 16,
                        color: palette.muted,
                        fontWeight: "600",
                        textDecorationLine: "line-through",
                      }}
                    >
                      {twEGP(original as number)}
                    </Text>
                  ) : null}
                </View>
              </PriceGate>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
              <Ionicons name="location-outline" size={14} color={palette.muted} />
              <Text style={{ fontSize: 13, color: palette.muted }}>{vehicle.location}</Text>
            </View>
          </Animated.View>

          {!user ? (
            <Animated.View entering={FadeInDown.delay(140).duration(420)}>
              <LockedDetails />
            </Animated.View>
          ) : (
            <>
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
                      last
                    />
                  </View>
                </TWCard>
              </Animated.View>

              {vehicle.saleDescription ? (
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
                    {t("sale.details").toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 14, lineHeight: 22, color: palette.text }}>
                    {vehicle.saleDescription}
                  </Text>
                </Animated.View>
              ) : null}

              {features.length > 0 ? (
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
              ) : null}
            </>
          )}
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
        {!user ? (
          <TWButton
            kind="pink"
            size="lg"
            icon="arrow-forward"
            iconRight
            full
            onPress={() => router.push("/(auth)/phone")}
          >
            {t("auth.lockedTitle")}
          </TWButton>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: palette.muted,
                  fontWeight: "700",
                  letterSpacing: track(0.5),
                }}
              >
                {t("sale.price").toUpperCase()}
              </Text>
              <Text style={{ fontSize: 18, color: colors.brand.trendyPink, fontWeight: "800" }}>
                {twEGP(sale)}
              </Text>
            </View>
            <TWButton
              kind="pink"
              size="lg"
              icon="arrow-forward"
              iconRight
              onPress={onReserve}
              style={{ paddingHorizontal: 28 }}
            >
              {t("sale.reserveCta")}
            </TWButton>
          </>
        )}
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
