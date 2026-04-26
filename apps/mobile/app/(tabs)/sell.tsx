import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { SalesListing } from "@trendywheels/types";
import { colors, spacing, typography } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";

export default function SellScreen(): JSX.Element {
  const router = useRouter();

  const q = useInfiniteQuery({
    queryKey: ["sales-listings"],
    queryFn: ({ pageParam = 1 }) => api.getSalesListings({ page: pageParam, limit: 20 }),
    getNextPageParam: (last, all) => (last.data.length === 20 ? all.length + 1 : undefined),
    initialPageParam: 1,
  });

  const listings = q.data?.pages.flatMap((p) => p.data) ?? [];

  const renderItem = useCallback(
    ({ item, index }: { item: SalesListing; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.gridItem}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push(`/sell/${item.id}`)}
        >
          <Image
            source={{ uri: (item.images as string[] | undefined)?.[0] ?? "https://placehold.co/400x300/2B0FF8/FFFFFF" }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardPrice}>{Number(item.price).toLocaleString()} EGP</Text>
            <Text style={styles.cardMeta}>{item.year} · {(item.mileage as number | undefined)?.toLocaleString()} km</Text>
          </View>
        </Pressable>
      </Animated.View>
    ),
    [router],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buy & Sell</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push("/sell/create")}>
          <Ionicons name="add" size={22} color="#000" />
          <Text style={styles.addBtnText}>List a Car</Text>
        </Pressable>
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.accent.DEFAULT} style={{ marginTop: 40 }} size="large" />
      ) : listings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="car-sport-outline" size={64} color={colors.text.secondary} />
          <Text style={styles.emptyText}>No listings yet</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push("/sell/create")}>
            <Text style={styles.emptyBtnText}>List your car</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList<SalesListing>
          data={listings}
          keyExtractor={(l) => l.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 100 }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { fontSize: typography.fontSize.h1, fontWeight: typography.fontWeight.bold, color: colors.text.light },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addBtnText: { color: "#000", fontWeight: "700", fontSize: 13 },
  gridItem: { flex: 1 },
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
  cardPrice: { color: colors.accent.DEFAULT, fontWeight: "700", fontSize: 14, marginTop: 4 },
  cardMeta: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  emptyText: { color: colors.text.secondary, fontSize: 16 },
  emptyBtn: {
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyBtnText: { color: "#000", fontWeight: "700" },
});
