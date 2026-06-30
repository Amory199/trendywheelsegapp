import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BackButton } from "../../../components/BackButton";
import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";
import { useDisplay, useTracking } from "../../../lib/typography";

interface Vehicle {
  id: string;
  name: string;
  category: string;
  type?: string;
  dailyRate?: number | string | null;
  listingType?: string;
  salePrice?: number | string | null;
  status?: string;
  available?: boolean;
  images?: string[];
}

const CATEGORIES = ["all", "golf-cart", "scooter", "jet-ski", "buggy", "utv", "hover-board"];
const CATEGORY_KEY: Record<
  string,
  | "admin.catAll"
  | "admin.catGolfCart"
  | "admin.catScooter"
  | "admin.catJetSki"
  | "admin.catBuggy"
  | "admin.catUtv"
  | "admin.catHoverBoard"
> = {
  all: "admin.catAll",
  "golf-cart": "admin.catGolfCart",
  scooter: "admin.catScooter",
  "jet-ski": "admin.catJetSki",
  buggy: "admin.catBuggy",
  utv: "admin.catUtv",
  "hover-board": "admin.catHoverBoard",
};

export default function AdminVehicles(): React.JSX.Element {
  const router = useRouter();
  const t = useT();
  const display = useDisplay();
  const track = useTracking();
  const [category, setCategory] = useState<string>("all");

  const categoryLabel = (c: string): string => (CATEGORY_KEY[c] ? t(CATEGORY_KEY[c]) : c);

  const statusLabel = (s?: string): string => {
    if (!s) return t("admin.dash");
    if (s === "available") return t("admin.vehicleStatusAvailable");
    if (s === "rented") return t("admin.vehicleStatusRented");
    if (s === "maintenance") return t("admin.vehicleStatusMaintenance");
    if (s === "inactive") return t("admin.vehicleStatusInactive");
    return s;
  };

  const q = useQuery({
    queryKey: ["admin", "vehicles", category],
    queryFn: async (): Promise<Vehicle[]> => {
      const r = await api.getVehicles(
        (category === "all" ? { limit: 200 } : { category, limit: 200 }) as never,
      );
      return ((r as { data?: Vehicle[] }).data ?? []) as Vehicle[];
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <BackButton style={{ marginLeft: -8 }} fallback="/admin/dashboard" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { letterSpacing: track(1.5) }]}>
            {t("admin.vehiclesKicker")}
          </Text>
          <Text style={[styles.title, display(0.3)]}>{t("admin.vehiclesTitle")}</Text>
        </View>
        <Pressable style={styles.fab} onPress={() => router.push("/admin/vehicles/new")}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.fabText}>{t("admin.vehiclesNew")}</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setCategory(item)}
              style={[styles.filter, category === item && styles.filterActive]}
            >
              <Text style={[styles.filterText, category === item && styles.filterTextActive]}>
                {categoryLabel(item)}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {q.isLoading ? (
        <ActivityIndicator
          color={colors.brand.friendlyBlue}
          style={{ marginTop: 40 }}
          size="large"
        />
      ) : (
        <FlatList<Vehicle>
          data={q.data ?? []}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching}
              onRefresh={() => q.refetch()}
              tintColor={colors.text.light}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>
                {t("admin.vehiclesEmptyPrefix")}
                {categoryLabel(category)}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/admin/vehicles/${item.id}`)}
            >
              <View style={styles.thumb}>
                {item.images?.[0] ? (
                  <Text>{/* image placeholder */}</Text>
                ) : (
                  <Ionicons name="car" size={28} color={colors.brand.poolBlue} />
                )}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {categoryLabel(item.category)} · {item.type ?? t("admin.dash")} ·{" "}
                  {item.listingType === "sale" ? (
                    // Sale-only cart: show the sale price, never the (null/placeholder) rent rate.
                    <>
                      {t("admin.egp")} {Number(item.salePrice ?? 0).toLocaleString()}
                    </>
                  ) : (
                    <>
                      {t("admin.egp")} {Number(item.dailyRate ?? 0).toLocaleString()}
                      {t("admin.perDay")}
                    </>
                  )}
                </Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          item.status === "available"
                            ? (colors.brand.ecoLimelight ?? "#A9F453")
                            : "#F5B800",
                      },
                    ]}
                  />
                  <Text style={styles.statusText}>{statusLabel(item.status)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 72,
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 12,
  },
  kicker: { color: colors.brand.friendlyBlue, fontSize: 11, fontWeight: "800" },
  title: {
    color: colors.text.light,
    fontSize: 28,
    textTransform: "uppercase",
    marginTop: 4,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand.trendyPink,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  fabText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  filterRow: { paddingBottom: 10 },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  filterActive: {
    backgroundColor: colors.brand.friendlyBlue,
    borderColor: colors.brand.friendlyBlue,
  },
  filterText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  filterTextActive: { color: "#fff" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.dark.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: colors.text.light, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.text.secondary, fontSize: 11 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    color: colors.text.secondary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
});
