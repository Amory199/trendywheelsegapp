// Customer order detail. Read-only view of one past purchase + the items
// inside it. v1.2 buyer pipeline will swap this for a rich tracking timeline
// (viewing scheduled → deposit paid → paperwork → delivery scheduled →
// delivered).

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { GuestGate } from "../../../components/GuestGate";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-store";
import { useT } from "../../../lib/locale";

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

const STATUS_LABEL_KEY: Record<string, string> = {
  pending: "buy.orderStatusPending",
  confirmed: "buy.orderStatusConfirmed",
  delivered: "buy.orderStatusDelivered",
  cancelled: "buy.orderStatusCancelled",
};

export default function OrderDetail(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const user = useAuth((s) => s.user);
  const q = useQuery({
    queryKey: ["my-orders", id],
    queryFn: async (): Promise<Order> => {
      const r = await api.getOrder(id!);
      return (r as { data: Order }).data;
    },
    enabled: !!id,
  });

  if (!user) return <GuestGate />;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `${t("buy.orderDetailTitlePrefix")}${id?.slice(0, 8) ?? ""}`,
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTitleStyle: { color: "#fff" },
          headerTintColor: "#fff",
        }}
      />
      {q.isLoading || !q.data ? (
        <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator color={colors.brand.trendyPink} />
        </View>
      ) : (
        <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 14 }}>
          <View style={styles.card}>
            <Text style={styles.label}>{t("buy.status")}</Text>
            <Text style={styles.value}>
              {STATUS_LABEL_KEY[q.data.status] ? t(STATUS_LABEL_KEY[q.data.status]) : q.data.status}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>{t("buy.placed")}</Text>
            <Text style={styles.value}>{new Date(q.data.createdAt).toLocaleString()}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>{t("buy.total")}</Text>
            <Text style={[styles.value, { color: colors.brand.ecoLimelight }]}>
              {t("buy.egp")} {Number(q.data.totalEgp).toLocaleString()}
            </Text>
          </View>

          <Text style={styles.section}>{t("buy.items")}</Text>
          {(q.data.items ?? []).map((it, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.product?.name ?? t("buy.fallbackItem")}</Text>
                <Text style={styles.itemMeta}>
                  {it.quantity} × {t("buy.egp")} {Number(it.unitPriceEgp).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {t("buy.egp")} {(Number(it.unitPriceEgp) * it.quantity).toLocaleString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  card: {
    backgroundColor: colors.dark.card,
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { color: "#888", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  value: { color: "#fff", fontSize: 15, fontWeight: "700", textTransform: "capitalize" },
  section: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
    textTransform: "uppercase",
  },
  itemRow: {
    backgroundColor: colors.dark.card,
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  itemName: { color: "#fff", fontWeight: "700" },
  itemMeta: { color: "#aaa", fontSize: 12, marginTop: 2 },
  itemTotal: { color: colors.brand.ecoLimelight, fontWeight: "700" },
});
