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

export default function MyOrders(): React.JSX.Element {
  const router = useRouter();

  const q = useQuery({
    queryKey: ["my-orders"],
    queryFn: async (): Promise<Order[]> => {
      const r = await api.getMyOrders();
      return ((r as { data: Order[] }).data ?? []) as Order[];
    },
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: "My Orders",
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
          data={q.data ?? []}
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
              <Text style={styles.emptyText}>You haven't placed any orders yet</Text>
              <Pressable style={styles.cta} onPress={() => router.push("/(tabs)/buy")}>
                <Text style={styles.ctaText}>Browse cars</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const tint = STATUS_TINT[item.status] ?? "#888";
            const firstItem = item.items?.[0];
            const itemName = firstItem?.product?.name ?? "Order";
            const extra = (item.items?.length ?? 0) > 1 ? ` + ${item.items!.length - 1} more` : "";
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
                    Order #{item.id.slice(0, 8)} · {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.amount}>EGP {Number(item.totalEgp).toLocaleString()}</Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: tint }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
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
