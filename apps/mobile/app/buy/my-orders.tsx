// Customer's "my orders" history. Lists every purchase the user has placed
// through /buy/[id], newest first. Each row is read-only for now; v1.2 buyer
// pipeline (deposit → paperwork → delivery) will turn these into rich tracking
// cards.

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "../../lib/api";
import { useT } from "../../lib/locale";

interface OrderItem {
  productId: string;
  quantity: number;
  unitPriceEgp: number | string;
  product?: { name?: string } | null;
}

interface Order {
  id: string;
  status: string;
  totalEgp: number | string;
  createdAt: string;
  items?: OrderItem[];
}

const STATUS_TINT: Record<string, string> = {
  pending: colors.brand.poolBlue,
  confirmed: colors.brand.friendlyBlue,
  delivered: colors.brand.ecoLimelight,
  cancelled: "#888",
};

const STATUS_LABEL_KEY: Record<string, string> = {
  pending: "buy.orderStatusPending",
  confirmed: "buy.orderStatusConfirmed",
  delivered: "buy.orderStatusDelivered",
  cancelled: "buy.orderStatusCancelled",
};

export default function MyOrders(): React.JSX.Element {
  const router = useRouter();
  const t = useT();

  // Shape must match the profile screen's ["my-orders"] query EXACTLY — both
  // share this cache key, so a divergent shape made one screen misread the
  // other's cached value (profile showed a count while this list rendered
  // empty). Both now cache { data: Order[] } and read `.data`.
  const q = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.getMyOrders().catch(() => ({ data: [] as Order[] })),
  });
  const orders = (q.data?.data ?? []) as Order[];

  return (
    <>
      <Stack.Screen
        options={{
          title: t("buy.myOrdersTitle"),
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTitleStyle: { color: "#fff" },
          headerTintColor: "#fff",
        }}
      />
      {q.isLoading ? (
        <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator color={colors.brand.trendyPink} />
        </View>
      ) : (
        <FlatList<Order>
          style={styles.root}
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 14, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching}
              onRefresh={() => q.refetch()}
              tintColor="#fff"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bag-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>{t("buy.noOrdersYet")}</Text>
              <Pressable style={styles.cta} onPress={() => router.push("/(tabs)/buy")}>
                <Text style={styles.ctaText}>{t("buy.browseCars")}</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const tint = STATUS_TINT[item.status] ?? "#888";
            const firstItem = item.items?.[0];
            const itemName = firstItem?.product?.name ?? t("buy.fallbackOrder");
            const extra =
              (item.items?.length ?? 0) > 1
                ? `${t("buy.moreSuffixPrefix")}${item.items!.length - 1}${t("buy.moreSuffix")}`
                : "";
            const statusLabel = STATUS_LABEL_KEY[item.status]
              ? t(STATUS_LABEL_KEY[item.status])
              : item.status;
            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({ pathname: "/buy/orders/[id]", params: { id: item.id } } as never)
                }
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.title}>
                    {itemName}
                    {extra}
                  </Text>
                  <Text style={styles.meta}>
                    {t("buy.orderNumberPrefix")}
                    {item.id.slice(0, 8)} · {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.amount}>
                    {t("buy.egp")} {Number(item.totalEgp).toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: tint }]}>
                  <Text style={styles.statusText}>{statusLabel}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#888" />
              </Pressable>
            );
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { color: "#aaa", fontSize: 14 },
  cta: {
    backgroundColor: colors.brand.trendyPink,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 8,
  },
  ctaText: { color: "#fff", fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 14,
  },
  title: { color: "#fff", fontSize: 15, fontWeight: "700" },
  meta: { color: "#888", fontSize: 12 },
  amount: { color: colors.brand.ecoLimelight, fontWeight: "700" },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
});
