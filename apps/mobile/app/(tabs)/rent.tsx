import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Vehicle } from "@trendywheels/types";
import { colors, spacing, twEGP, twPalette } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

import { api } from "../../lib/api";

const PAGE_SIZE = 20;
const palette = twPalette(false);

export default function RentScreen(): JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const q = useInfiniteQuery({
    queryKey: ["vehicles", search],
    queryFn: ({ pageParam = 1 }) => api.getVehicles({ page: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (last, all) =>
      last.data.length === PAGE_SIZE ? all.length + 1 : undefined,
    initialPageParam: 1,
  });

  const vehicles = q.data?.pages.flatMap((p) => p.data) ?? [];

  const renderItem = useCallback(
    ({ item, index }: { item: Vehicle; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push(`/rent/${item.id}`)}
        >
          <Image
            source={{ uri: (item.images as string[] | undefined)?.[0] ?? "https://placehold.co/400x225/2B0FF8/FFFFFF" }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
          />
          {item.status === "available" ? (
            <View style={styles.availableDot} />
          ) : null}
          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {item.type} · {item.seating} seats · {item.transmission}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardPrice}>
                {twEGP(Number(item.dailyRate))}/day
              </Text>
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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>TRENDY<Text style={styles.eyebrowDot}>.</Text>WHEELS</Text>
        <Text style={styles.title}>Find your ride</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={palette.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or city…"
            placeholderTextColor={palette.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.brand.friendlyBlue} style={{ marginTop: 40 }} size="large" />
      ) : vehicles.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="car-outline" size={64} color={palette.muted} />
          <Text style={styles.emptyText}>No vehicles found</Text>
        </View>
      ) : (
        <FlatList<Vehicle>
          data={vehicles}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 110 }}
          renderItem={renderItem}
          onEndReached={() => q.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            q.isFetchingNextPage ? (
              <ActivityIndicator color={colors.brand.friendlyBlue} style={{ padding: spacing.md }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.muted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  eyebrowDot: { color: colors.brand.trendyPink },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
    letterSpacing: -0.4,
    marginBottom: spacing.md,
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
  cardName: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
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
