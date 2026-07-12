import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  discountPercent,
  isVehicleOnSale,
  VEHICLE_CATEGORIES,
  type VehicleCategory,
} from "@trendywheels/types";
import { colors, spacing, twPalette } from "@trendywheels/ui-tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryVideoHero } from "../../../components/CategoryVideoHero";
import { ErrorState } from "../../../components/ErrorState";
import { ListingCard } from "../../../components/ListingCard";
import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";
import { useRTL } from "../../../lib/typography";

// Same product shape the Buy tab reads — carts link to a Vehicle, which is
// where the sale price, category, and fuel type actually live (the API
// flattens them onto the product).
interface Product {
  id: string;
  name: string;
  priceEgp: string | number;
  images: string[];
  inStock: boolean;
  brand?: string | null;
  vehicleId?: string | null;
  salePrice?: string | number | null;
  originalPriceEgp?: string | number | null;
  vehicleCategory?: VehicleCategory | null;
  vehicleFuelType?: string | null;
}

const PAGE_SIZE = 20;
const PADDING = 16;
const GAP = 12;
const COL_W = (Dimensions.get("window").width - PADDING * 2 - GAP) / 2;
const palette = twPalette(false);

export default function BuyCategoryScreen(): JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const rtl = useRTL();
  const { key } = useLocalSearchParams<{ key: string }>();
  const [search, setSearch] = useState("");

  const isAll = key === "all";

  // NOTE: Buy deliberately does NOT honour the admin category-visibility set
  // (that governs Rent only). Which categories appear in Buy is driven purely by
  // what's listed for sale in the catalog, so no hidden-category bounce here — a
  // category with no listings just shows the empty state.

  const categoryMeta = useMemo(() => VEHICLE_CATEGORIES.find((c) => c.key === key) ?? null, [key]);
  const categoryLabel = useMemo(() => {
    if (isAll) return t("buy.allCategories");
    // home.categories.* is the shared, parity-complete localized label source
    // for VehicleCategory (the English labels in @trendywheels/types are data).
    return categoryMeta ? t(`home.categories.${categoryMeta.key}`) : t("buy.catalogTitle");
  }, [categoryMeta, isAll, t]);

  const q = useInfiniteQuery({
    queryKey: ["products", "by-category", key],
    queryFn: ({ pageParam = 1 }) =>
      api.request<{ data: Product[] }>(
        "GET",
        `/api/products?page=${pageParam}&limit=${PAGE_SIZE}${
          !isAll && key ? `&vehicleCategory=${key}` : ""
        }`,
      ),
    getNextPageParam: (last, all) => (last.data.length === PAGE_SIZE ? all.length + 1 : undefined),
    initialPageParam: 1,
  });

  const products = q.data?.pages.flatMap((p) => p.data) ?? [];
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) => `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(s));
  }, [products, search]);

  const renderItem = useCallback(
    ({ item: p, index }: { item: Product; index: number }) => {
      // If the cart is linked to a discounted vehicle, show the sale price
      // with the original struck through — same as the Buy tab grid.
      const onSale = isVehicleOnSale(p);
      const shown = onSale ? Number(p.salePrice) : Number(p.priceEgp);
      // A discounted cart's sale lives on its linked vehicle, and the vehicle
      // reserve flow is what actually honors salePrice — so route there
      // (matches the Buy tab) instead of the product order, which would
      // charge full price. Non-sale items → /buy/[id].
      const target = onSale && p.vehicleId ? `/sale/${p.vehicleId}` : `/buy/${p.id}`;
      return (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
          <ListingCard
            width={COL_W}
            imageRatio={1}
            title={p.name}
            priceLabel={`${t("buy.egp")} ${shown.toLocaleString()}`}
            strikePriceLabel={
              onSale ? `${t("buy.egp")} ${Number(p.originalPriceEgp).toLocaleString()}` : null
            }
            badge={onSale ? `-${discountPercent(p)}%` : null}
            badgeColor={colors.brand.ecoLimelight}
            image={p.images[0]}
            overlayLabel={!p.inStock ? t("buy.outOfStock") : null}
            categoryKey={p.vehicleCategory}
            fuelType={p.vehicleFuelType}
            onPress={() => router.push(target as never)}
          />
        </Animated.View>
      );
    },
    [router, t],
  );

  return (
    <View style={styles.container}>
      {!isAll && categoryMeta ? (
        <View>
          <CategoryVideoHero
            categoryKey={categoryMeta.key}
            label={t(`home.categories.${categoryMeta.key}`)}
            icon={categoryMeta.icon as never}
            height={220}
          />
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              position: "absolute",
              top: insets.top + 8,
              left: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.45)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </Pressable>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {categoryLabel}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      )}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={palette.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("buy.searchPlaceholder")}
          placeholderTextColor={palette.muted}
          value={search}
          onChangeText={setSearch}
          textAlign={rtl ? "right" : "left"}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>

      {q.isLoading ? (
        <ActivityIndicator
          color={colors.brand.friendlyBlue}
          style={{ marginTop: 40 }}
          size="large"
        />
      ) : q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="pricetag-outline" size={64} color={palette.muted} />
          <Text style={styles.emptyText}>
            {search ? t("buy.noMatches") : t("buy.noProductsInCategory")}
          </Text>
        </View>
      ) : (
        <FlatList<Product>
          data={filtered}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 40 }}
          renderItem={renderItem}
          onEndReached={() => q.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            q.isFetchingNextPage ? (
              <ActivityIndicator color={colors.brand.friendlyBlue} style={{ padding: 14 }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  topBarTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.cardAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    height: 44,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, color: palette.text, fontSize: 14 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  emptyText: { color: palette.muted, fontSize: 16 },
});
