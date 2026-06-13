import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";

interface Listing {
  id: string;
  title: string;
  make?: string;
  model?: string;
  year?: number;
  price: number | string;
  status?: string;
  category?: string;
}

const SALE_STATUS_KEY: Record<
  string,
  "admin.saleStatusActive" | "admin.saleStatusSold" | "admin.saleStatusPaused"
> = {
  active: "admin.saleStatusActive",
  sold: "admin.saleStatusSold",
  paused: "admin.saleStatusPaused",
};

export default function AdminSales(): React.JSX.Element {
  const router = useRouter();
  const t = useT();

  const saleStatus = (s?: string): string => {
    const key = s ?? "active";
    return SALE_STATUS_KEY[key] ? t(SALE_STATUS_KEY[key]) : key;
  };

  const q = useQuery({
    queryKey: ["admin", "sales"],
    queryFn: async (): Promise<Listing[]> => {
      const r = await api.adminListSales();
      return ((r as { data?: Listing[] }).data ?? []) as Listing[];
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{t("admin.salesKicker")}</Text>
        <Text style={styles.title}>{t("admin.salesTitle")}</Text>
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.brand.trendyPink} style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList<Listing>
          data={q.data ?? []}
          keyExtractor={(l) => l.id}
          removeClippedSubviews
          windowSize={7}
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
              <Ionicons name="pricetags-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>{t("admin.salesEmpty")}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/admin/sales/${item.id}`)}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.tt} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.meta}>
                  {item.make ?? t("admin.dash")} {item.model ?? ""}{" "}
                  {item.year ? `· ${item.year}` : ""}
                </Text>
                <Text style={styles.price}>
                  {t("admin.egp")} {Number(item.price).toLocaleString()}
                </Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  item.status === "sold" && { backgroundColor: "#A9F453" },
                ]}
              >
                <Text style={[styles.statusText, item.status === "sold" && { color: "#000" }]}>
                  {saleStatus(item.status)}
                </Text>
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
  header: { paddingTop: 72, paddingHorizontal: 18, paddingBottom: 14 },
  kicker: { color: colors.brand.trendyPink, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: {
    color: colors.text.light,
    fontSize: 28,
    fontFamily: "Anton",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 4,
  },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
  },
  tt: { color: colors.text.light, fontSize: 14, fontWeight: "700" },
  meta: { color: colors.text.secondary, fontSize: 11 },
  price: { color: colors.brand.trendyPink, fontSize: 13, fontWeight: "800", marginTop: 2 },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  statusText: {
    color: colors.text.secondary,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
