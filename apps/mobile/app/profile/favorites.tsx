import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoryColorOf, colors, spacing, twEGP, typography } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GuestGate } from "../../components/GuestGate";
import { TWSkeletonCard } from "../../components/ui";
import { logEvent } from "../../lib/analytics";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";

// The favorites endpoint returns a trimmed vehicle (select, not the full
// model) with images as [{ url }] — narrower than the api-client's Vehicle
// type, so it gets its own shape here.
interface FavoriteVehicle {
  id: string;
  name: string;
  category: string;
  type: string;
  dailyRate: number;
  salePrice: number | null;
  listingType: string;
  status: string;
  averageRating: number;
  reviewCount: number;
  images: Array<{ url: string } | string>;
}

interface FavoriteRow {
  id: string;
  vehicleId: string;
  createdAt: string;
  vehicle: FavoriteVehicle;
}

function thumbOf(vehicle: FavoriteVehicle): string {
  const first = vehicle.images?.[0];
  const url = typeof first === "string" ? first : first?.url;
  return url ?? "https://placehold.co/200x200/2B0FF8/FFFFFF?text=TW";
}

export default function FavoritesScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);

  const query = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => (await api.getFavorites()) as unknown as { data: FavoriteRow[] },
    enabled: !!user,
  });

  const removeMutation = useMutation({
    mutationFn: (vehicleId: string) => api.removeFavorite(vehicleId),
    onMutate: async (vehicleId) => {
      await qc.cancelQueries({ queryKey: ["favorites"] });
      const prev = qc.getQueryData<{ data: FavoriteRow[] }>(["favorites"]);
      qc.setQueryData<{ data: FavoriteRow[] }>(["favorites"], (old) =>
        old ? { ...old, data: old.data.filter((f) => f.vehicleId !== vehicleId) } : old,
      );
      return { prev };
    },
    onError: (_err, _vehicleId, ctx) => {
      if (ctx?.prev) qc.setQueryData(["favorites"], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const onRemove = (vehicleId: string): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeMutation.mutate(vehicleId);
    logEvent("favorite_removed", { vehicle_id: vehicleId });
  };

  const favorites = query.data?.data ?? [];

  if (!user) return <GuestGate />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.title}>{t("profile.favorites.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      {query.isLoading ? (
        <View style={{ padding: spacing.md, gap: spacing.md }}>
          <TWSkeletonCard height={96} />
          <TWSkeletonCard height={96} />
          <TWSkeletonCard height={96} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={64} color={colors.text.secondary} />
          <Text style={styles.emptyText}>{t("profile.favorites.emptyTitle")}</Text>
          <Text style={styles.emptyHint}>{t("profile.favorites.emptyHint")}</Text>
          <Pressable style={styles.browseBtn} onPress={() => router.push("/(tabs)/rent")}>
            <Text style={styles.browseBtnText}>{t("profile.favorites.browse")}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList<FavoriteRow>
          data={favorites}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor={colors.text.light}
            />
          }
          renderItem={({ item, index }) => {
            // Brand category outline — duo categories fall back to their first
            // color here (gradient rings stay on the primary card surfaces).
            const outline = categoryColorOf(item.vehicle.category);
            return (
              <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                <Pressable
                  style={[
                    styles.card,
                    outline ? { borderWidth: 2, borderColor: outline[0] } : null,
                  ]}
                  onPress={() =>
                    router.push(
                      item.vehicle.listingType === "sale"
                        ? `/sale/${item.vehicleId}`
                        : `/rent/${item.vehicleId}`,
                    )
                  }
                >
                  <Image
                    source={{ uri: thumbOf(item.vehicle) }}
                    style={styles.thumb}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.vehicle.name}
                    </Text>
                    <Text style={styles.price}>
                      {item.vehicle.listingType === "sale" && item.vehicle.salePrice != null
                        ? twEGP(Number(item.vehicle.salePrice))
                        : `${twEGP(Number(item.vehicle.dailyRate))} ${t("profile.favorites.perDay")}`}
                    </Text>
                    <View style={styles.metaRow}>
                      {item.vehicle.reviewCount > 0 && (
                        <View style={styles.ratingWrap}>
                          <Ionicons name="star" size={12} color="#F5B800" />
                          <Text style={styles.ratingText}>
                            {Number(item.vehicle.averageRating).toFixed(1)} (
                            {item.vehicle.reviewCount})
                          </Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.statusChip,
                          item.vehicle.status === "available" && styles.statusChipAvailable,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            item.vehicle.status === "available" && styles.statusTextAvailable,
                          ]}
                        >
                          {item.vehicle.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    hitSlop={8}
                    style={styles.heartBtn}
                    onPress={() => onRemove(item.vehicleId)}
                  >
                    <Ionicons name="heart" size={20} color={colors.brand.trendyPink} />
                  </Pressable>
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text.light,
    fontSize: typography.fontSize.h3,
    fontWeight: typography.fontWeight.bold,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.dark.border },
  info: { flex: 1, gap: 4 },
  name: { color: colors.text.light, fontWeight: "700", fontSize: 15 },
  price: { color: colors.brand.trendyPink, fontWeight: "700", fontSize: 13 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ratingWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { color: colors.text.secondary, fontSize: 12, fontWeight: "600" },
  statusChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: `${colors.text.secondary}22`,
  },
  statusChipAvailable: { backgroundColor: `${colors.success}22` },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
    color: colors.text.secondary,
  },
  statusTextAvailable: { color: colors.success },
  heartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.brand.trendyPink}1A`,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyText: { color: colors.text.light, fontSize: 18, fontWeight: "700", marginTop: spacing.sm },
  emptyHint: { color: colors.text.secondary, fontSize: 14, textAlign: "center" },
  browseBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand.trendyPink,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  browseBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
