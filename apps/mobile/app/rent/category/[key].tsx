import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { VEHICLE_CATEGORIES, type Vehicle, type VehicleCategory } from "@trendywheels/types";
import { colors, spacing, twEGP, twPalette } from "@trendywheels/ui-tokens";
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

import { api } from "../../../lib/api";

const PAGE_SIZE = 20;
const palette = twPalette(false);

export default function RentCategoryScreen(): JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { key } = useLocalSearchParams<{ key: string }>();
  const [search, setSearch] = useState("");

  const isAll = key === "all";
  const categoryLabel = useMemo(() => {
    if (isAll) return "All categories";
    return VEHICLE_CATEGORIES.find((c) => c.key === key)?.label ?? "Vehicles";
  }, [key, isAll]);

  const q = useInfiniteQuery({
    queryKey: ["vehicles", "by-category", key],
    queryFn: ({ pageParam = 1 }) =>
      api.getVehicles({
        page: pageParam,
        limit: PAGE_SIZE,
        ...(!isAll && key ? { category: key as VehicleCategory } : {}),
      }),
    getNextPageParam: (last, all) => (last.data.length === PAGE_SIZE ? all.length + 1 : undefined),
    initialPageParam: 1,
  });

  const vehicles = (q.data?.pages.flatMap((p) => p.data) ?? []) as Vehicle[];
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return vehicles;
    return vehicles.filter((v) =>
      `${v.name} ${v.location ?? ""} ${v.type ?? ""}`.toLowerCase().includes(s),
    );
  }, [vehicles, search]);

  const renderItem = useCallback(
    ({ item, index }: { item: Vehicle; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          android_ripple={{ color: "rgba(43,15,248,0.10)", borderless: false }}
          onPress={() => router.push(`/rent/${item.id}`)}
        >
          <Image
            source={{
              uri:
                (item.images as string[] | undefined)?.[0] ??
                "https://placehold.co/400x225/2B0FF8/FFFFFF",
            }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
          />
          {item.status === "available" ? <View style={styles.availableDot} /> : null}
          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {item.type} · {item.seating} seats · {item.transmission}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardPrice}>{twEGP(Number(item.dailyRate))}/day</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={palette.muted} />
                <Text style={styles.cardLocation} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    ),
    [router],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {categoryLabel}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={palette.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, location, or type…"
          placeholderTextColor={palette.muted}
          value={search}
          onChangeText={setSearch}
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
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="car-outline" size={64} color={palette.muted} />
          <Text style={styles.emptyText}>
            {search ? "No matches" : "No vehicles in this category"}
          </Text>
        </View>
      ) : (
        <FlatList<Vehicle>
          data={filtered}
          keyExtractor={(v) => v.id}
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
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.border,
    position: "relative",
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  cardImage: { width: "100%", aspectRatio: 16 / 9, backgroundColor: palette.cardAlt },
  availableDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.ecoLimelight,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  cardBody: { padding: spacing.md },
  cardName: { color: palette.text, fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  cardMeta: { color: palette.muted, fontSize: 12.5, marginTop: 2 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  cardPrice: { color: colors.brand.trendyPink, fontWeight: "800", fontSize: 15 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  cardLocation: { color: palette.muted, fontSize: 11.5 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  emptyText: { color: palette.muted, fontSize: 16 },
});
