import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { VEHICLE_CATEGORIES, type SalesListing, type VehicleCategory } from "@trendywheels/types";
import { colors, spacing, typography } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";
import { useRTL } from "../../../lib/typography";
import { useRequireAuth } from "../../../lib/use-require-auth";

const PAGE_SIZE = 20;

export default function SellCategoryScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const insets = useSafeAreaInsets();
  const rtl = useRTL();
  const requireAuth = useRequireAuth();
  const { key } = useLocalSearchParams<{ key: string }>();
  const [search, setSearch] = useState("");

  const isAll = key === "all";
  const categoryMeta = useMemo(() => VEHICLE_CATEGORIES.find((c) => c.key === key) ?? null, [key]);
  const categoryLabel = useMemo(() => {
    if (isAll) return t("sell.category.allCategories");
    // home.categories.* is the shared, parity-complete localized label source
    // for VehicleCategory (the English labels in @trendywheels/types are data).
    return categoryMeta
      ? t(`home.categories.${categoryMeta.key}`)
      : t("sell.category.fallbackTitle");
  }, [categoryMeta, isAll, t]);

  const q = useInfiniteQuery({
    queryKey: ["sales-listings", "by-category", key],
    queryFn: ({ pageParam = 1 }) =>
      api.getSalesListings({
        page: pageParam,
        limit: PAGE_SIZE,
        ...(!isAll && key ? { category: key as VehicleCategory } : {}),
      }),
    getNextPageParam: (last, all) => (last.data.length === PAGE_SIZE ? all.length + 1 : undefined),
    initialPageParam: 1,
  });

  const listings = (q.data?.pages.flatMap((p) => p.data) ?? []) as SalesListing[];
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return listings;
    return listings.filter((l) =>
      `${l.title} ${l.make ?? ""} ${l.model ?? ""}`.toLowerCase().includes(s),
    );
  }, [listings, search]);

  const renderItem = useCallback(
    ({ item, index }: { item: SalesListing; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 40).springify()} style={{ flex: 1 }}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          android_ripple={{ color: "rgba(43,15,248,0.10)", borderless: false }}
          onPress={() => router.push(`/sell/${item.id}`)}
        >
          <Image
            source={{
              uri:
                (item.images as string[] | undefined)?.[0] ??
                "https://placehold.co/400x300/2B0FF8/FFFFFF",
            }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cardPrice}>
              {Number(item.price).toLocaleString()} {t("sell.egp")}
            </Text>
            <Text style={styles.cardMeta}>
              {item.year} · {(item.mileage as number | undefined)?.toLocaleString()} km
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    ),
    [router],
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
            <Ionicons name="chevron-back" size={24} color={colors.text.light} />
          </Pressable>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {categoryLabel}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      )}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("sell.category.searchPlaceholder")}
          placeholderTextColor={colors.text.secondary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
          textAlign={rtl ? "right" : "left"}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
          </Pressable>
        ) : null}
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.accent.DEFAULT} style={{ marginTop: 40 }} size="large" />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="car-sport-outline" size={64} color={colors.text.secondary} />
          <Text style={styles.emptyText}>
            {search ? t("sell.category.noMatches") : t("sell.category.emptyCategory")}
          </Text>
        </View>
      ) : (
        <FlatList<SalesListing>
          data={filtered}
          keyExtractor={(l) => l.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 40 }}
          renderItem={renderItem}
          onEndReached={() => q.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            q.isFetchingNextPage ? (
              <ActivityIndicator color={colors.accent.DEFAULT} style={{ padding: spacing.md }} />
            ) : null
          }
        />
      )}

      {/* Floating "+" — jump straight into listing creation from anywhere in
          the marketplace. Auth-gated like every account action: guests get
          bounced to phone sign-in, browsing itself stays open. */}
      <Pressable
        onPress={() => requireAuth(() => router.push("/sell/create"))}
        accessibilityLabel={t("sell.category.createListing")}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 24 },
          pressed && styles.fabPressed,
        ]}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.dark.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  topBarTitle: {
    color: colors.text.light,
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
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: spacing.md,
    height: 44,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.text.light, fontSize: 14 },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  cardImage: { width: "100%", aspectRatio: 4 / 3 },
  cardBody: { padding: spacing.sm },
  cardTitle: { color: colors.text.light, fontWeight: "600", fontSize: 13, lineHeight: 18 },
  cardPrice: {
    color: colors.accent.DEFAULT,
    fontWeight: "700",
    fontSize: typography.fontSize.body,
    marginTop: 4,
  },
  cardMeta: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  emptyText: { color: colors.text.secondary, fontSize: 16, textAlign: "center" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand.trendyPink,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.94 }] },
});
