import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { isVehicleOnSale, type Vehicle } from "@trendywheels/types";
import { colors, TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryCircles } from "../../components/CategoryCircles";
import { DeliverAreaPicker } from "../../components/DeliverAreaPicker";
import { ContinueCard } from "../../components/ContinueCard";
import { HomeSearchBar } from "../../components/HomeSearchBar";
import { ListingCard } from "../../components/ListingCard";
import { PromoCarousel } from "../../components/PromoCarousel";
import { QuickAccessGrid } from "../../components/QuickAccessGrid";
import { Rail } from "../../components/Rail";
import { RedeemSaveRow } from "../../components/RedeemSaveRow";
import { SectionHeader } from "../../components/SectionHeader";
import { ServicesRail } from "../../components/ServicesRail";
import { TWAurora } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { useTabBarScrollHandler } from "../../lib/tab-bar-scroll";
import { useDisplay, useTracking } from "../../lib/typography";
import { useTheme } from "../../lib/use-theme";
import { vehicleImageUrl } from "../../lib/vehicle";

type ProductCategory = "cart_new" | "cart_used" | "parts" | "accessory";
interface Product {
  id: string;
  name: string;
  priceEgp: string | number;
  images: string[];
  inStock: boolean;
  category: ProductCategory;
  // Linked vehicle's category/fuel (API-surfaced) → brand outline + fuel pill.
  vehicleCategory?: string | null;
  vehicleFuelType?: string | null;
}

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const t = useT();
  const display = useDisplay();
  const track = useTracking();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const scrollHandler = useTabBarScrollHandler();
  const { palette } = useTheme();

  const vehiclesQ = useQuery({
    queryKey: ["home-vehicles"],
    queryFn: () => api.request<{ data: Vehicle[] }>("GET", "/api/vehicles?limit=40"),
  });
  const productsQ = useQuery({
    queryKey: ["home-products"],
    queryFn: () => api.request<{ data: Product[] }>("GET", "/api/products?limit=40"),
  });

  const vehicles = React.useMemo(() => (vehiclesQ.data?.data ?? []) as Vehicle[], [vehiclesQ.data]);
  const products = React.useMemo(() => (productsQ.data?.data ?? []) as Product[], [productsQ.data]);

  // Rent uses Vehicles (rich rating/location, /rent/[id] detail). Buy uses
  // Products (real string[] images, working /buy/[id] detail + cart) — keeps
  // each rail pointed at a detail screen that actually fits its intent.
  const forRent = React.useMemo(
    () => vehicles.filter((v) => v.listingType === "rent" || v.listingType === "both").slice(0, 10),
    [vehicles],
  );
  // ON SALE = genuinely discounted vehicles: a before-price (originalPriceEgp)
  // that's higher than the current salePrice. Plain for-sale carts (no discount)
  // belong in the Buy rail, not here — so the two sections never duplicate.
  const onSale = React.useMemo(() => vehicles.filter(isVehicleOnSale).slice(0, 10), [vehicles]);
  // Carts for sale = cart products EXCLUDING the ones whose vehicle is currently
  // discounted (those show in On Sale instead). Keeps Buy ↔ On Sale in sync so a
  // cart never appears in both rails.
  const cartsForSale = React.useMemo(() => {
    const discountedVehicleIds = new Set(onSale.map((v) => v.id));
    return products
      .filter((p) => p.category === "cart_new" || p.category === "cart_used")
      .filter((p) => {
        const vid = (p as { vehicleId?: string | null }).vehicleId;
        return !vid || !discountedVehicleIds.has(vid);
      })
      .slice(0, 10);
  }, [products, onSale]);
  const partsShop = React.useMemo(
    () => products.filter((p) => p.category === "parts" || p.category === "accessory").slice(0, 10),
    [products],
  );

  const renderVehicle = React.useCallback(
    (v: Vehicle) => (
      <ListingCard
        title={v.name}
        priceLabel={`${t("home.egp")} ${Number(v.dailyRate).toLocaleString()}${t("home.perDay")}`}
        image={vehicleImageUrl(v.images?.[0])}
        rating={v.averageRating}
        location={v.location}
        badge={t("home.badgeForRent")}
        badgeColor={colors.brand.friendlyBlue}
        categoryKey={v.category}
        fuelType={v.fuelType}
        onPress={() => router.push(`/rent/${v.id}` as never)}
      />
    ),
    [t, router],
  );
  const renderSaleVehicle = React.useCallback(
    (v: Vehicle) => {
      const orig = v.originalPriceEgp != null ? Number(v.originalPriceEgp) : null;
      const sale = Number(v.salePrice);
      const hasDiscount = orig != null && orig > sale;
      return (
        <ListingCard
          title={v.name}
          priceLabel={`${t("home.egp")} ${sale.toLocaleString()}`}
          strikePriceLabel={hasDiscount ? `${t("home.egp")} ${orig.toLocaleString()}` : null}
          image={vehicleImageUrl(v.images?.[0])}
          rating={v.averageRating}
          location={v.location}
          badge={t("home.dealsBadge")}
          badgeColor={colors.brand.ecoLimelight}
          categoryKey={v.category}
          fuelType={v.fuelType}
          onPress={() => router.push(`/sale/${v.id}` as never)}
        />
      );
    },
    [t, router],
  );
  const renderProduct = React.useCallback(
    (p: Product) => (
      <ListingCard
        title={p.name}
        priceLabel={`${t("home.egp")} ${Number(p.priceEgp).toLocaleString()}`}
        image={p.images?.[0]}
        overlayLabel={!p.inStock ? t("buy.outOfStock") : null}
        categoryKey={p.vehicleCategory}
        fuelType={p.vehicleFuelType}
        onPress={() => router.push(`/buy/${p.id}` as never)}
      />
    ),
    [t, router],
  );
  const renderSaleProduct = React.useCallback(
    (p: Product) => (
      <ListingCard
        title={p.name}
        priceLabel={`${t("home.egp")} ${Number(p.priceEgp).toLocaleString()}`}
        image={p.images?.[0]}
        badge={t("home.badgeForSale")}
        badgeColor={colors.brand.trendyPink}
        overlayLabel={!p.inStock ? t("buy.outOfStock") : null}
        categoryKey={p.vehicleCategory}
        fuelType={p.vehicleFuelType}
        onPress={() => router.push(`/buy/${p.id}` as never)}
      />
    ),
    [t, router],
  );

  const firstName = user?.name?.split(" ")[0];
  const greeting = firstName
    ? `${t("home.heroGreeting")} ${firstName.toUpperCase()}`
    : t("home.welcome");
  // Surface retry if EITHER feed fails — a half-failure otherwise silently
  // collapses its rails (Rail.hideWhenEmpty) with no way to recover.
  const hasError = vehiclesQ.isError || productsQ.isError;

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      {/* Electric Night — ambient aurora glowing through the feed (dark only). */}
      <TWAurora variant="ambient" />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SAFE_BOTTOM }}
      >
        {/* HEADER — brand gradient with a presentational location pill. */}
        <LinearGradient
          colors={[colors.brand.friendlyBlue, colors.brand.poolBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 10 }]}
        >
          <Ionicons
            name="car-sport"
            size={64}
            color="rgba(255,255,255,0.12)"
            style={styles.headerDecor}
          />
          <View style={styles.headerTop}>
            <DeliverAreaPicker />

            <Pressable
              onPress={() => router.push("/profile/notifications")}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Ionicons name="notifications-outline" size={20} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              hitSlop={8}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{(firstName?.[0] ?? "T").toUpperCase()}</Text>
            </Pressable>
          </View>

          <Text style={[styles.eyebrow, { letterSpacing: track(1.8) }]}>{greeting}</Text>
          <Text style={[styles.tagline, display(0.3)]}>{t("home.tagline")}</Text>
        </LinearGradient>

        {/* SEARCH — floats over the gradient's rounded bottom. */}
        <View style={styles.searchFloat}>
          <HomeSearchBar />
        </View>

        {/* QUICK ACCESS — every flow one tap from the home screen. */}
        <QuickAccessGrid />

        {/* CONTINUE — personalization slot; null for guests / nothing in progress. */}
        <ContinueCard />

        {/* PROMO CAROUSEL — replaces the expo-video banner (OTA-safe). */}
        <PromoCarousel />

        {/* REDEEM & SAVE — loyalty + refer; collapses to one sign-in nudge for guests. */}
        <RedeemSaveRow />

        {hasError ? (
          <Pressable
            style={[
              styles.errorBox,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
            onPress={() => {
              void vehiclesQ.refetch();
              void productsQ.refetch();
            }}
          >
            <Ionicons name="cloud-offline-outline" size={20} color={palette.muted} />
            <Text style={[styles.errorText, { color: palette.muted }]}>
              {t("common.error")} · {t("common.tryAgain")}
            </Text>
          </Pressable>
        ) : null}

        {/* FOR RENT */}
        <Rail<Vehicle>
          title={t("home.railForRent")}
          data={forRent}
          loading={vehiclesQ.isLoading}
          keyExtractor={(v) => v.id}
          seeAllLabel={t("home.seeAll")}
          onSeeAll={() => router.push("/(tabs)/rent")}
          renderCard={renderVehicle}
        />

        {/* SHOP BY TYPE — secondary discovery row. */}
        <View style={styles.section}>
          <SectionHeader title={t("home.browse")} subtitle={t("home.browseRentSubtitle")} />
          <CategoryCircles onPress={(key) => router.push(`/rent/category/${key}` as never)} />
        </View>

        {/* CARTS FOR SALE */}
        <Rail<Product>
          title={t("home.railForSale")}
          subtitle={t("home.forSaleSubtitle")}
          data={cartsForSale}
          loading={productsQ.isLoading}
          keyExtractor={(p) => p.id}
          seeAllLabel={t("home.seeAll")}
          onSeeAll={() => router.push("/(tabs)/buy")}
          renderCard={renderSaleProduct}
        />

        {/* ON SALE — honest salePrice only; hidden when none qualify. */}
        <Rail<Vehicle>
          title={t("home.railDeals")}
          subtitle={t("home.dealsSubtitle")}
          data={onSale}
          loading={vehiclesQ.isLoading}
          keyExtractor={(v) => v.id}
          seeAllLabel={t("home.seeAll")}
          onSeeAll={() => router.push("/(tabs)/rent")}
          renderCard={renderSaleVehicle}
        />

        {/* PARTS & ACCESSORIES */}
        <Rail<Product>
          title={t("home.railShop")}
          data={partsShop}
          loading={productsQ.isLoading}
          keyExtractor={(p) => p.id}
          seeAllLabel={t("home.seeAll")}
          onSeeAll={() => router.push("/(tabs)/buy")}
          renderCard={renderProduct}
        />

        {/* SERVICES */}
        <ServicesRail />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 34,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  headerDecor: { position: "absolute", top: 12, right: 8 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  eyebrow: { fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: "700", marginTop: 18 },
  tagline: { fontSize: 26, color: "#fff", marginTop: 2 },
  searchFloat: { marginTop: -26, zIndex: 2 },
  section: { marginTop: 22 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontWeight: "600" },
});
