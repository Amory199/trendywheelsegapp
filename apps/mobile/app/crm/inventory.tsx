import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { api } from "../../lib/api";

interface InventoryVehicle {
  id: string;
  name: string;
  type: string;
  seating: number;
  dailyRate: number | string;
  location: string;
  status: string;
  images?: Array<{ url: string }>;
}

export default function CrmInventory(): JSX.Element {
  const listQ = useQuery({
    queryKey: ["crm", "inventory"],
    queryFn: async (): Promise<InventoryVehicle[]> => {
      const r = await api.crmInventory();
      return (r.data ?? []) as InventoryVehicle[];
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <Text style={styles.subtitle}>Available carts you can attach to a lead</Text>
      </View>

      {listQ.isLoading ? (
        <ActivityIndicator color={colors.brand.trendyPink} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={listQ.data ?? []}
          keyExtractor={(v) => v.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={listQ.isFetching}
              onRefresh={() => listQ.refetch()}
              tintColor={colors.text.light}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-sport-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No vehicles available</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.images?.[0]?.url ? (
                <Image
                  source={{ uri: item.images[0].url }}
                  style={styles.thumb}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.thumb, { backgroundColor: colors.dark.bg }]} />
              )}
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {item.seating}-seater · {item.location}
              </Text>
              <Text style={styles.price}>EGP {Number(item.dailyRate).toLocaleString()}/day</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  header: { paddingTop: 56, paddingHorizontal: 18, paddingBottom: 8 },
  title: { color: colors.text.light, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.text.secondary, fontSize: 12, marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  card: {
    flex: 1,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 10,
    gap: 6,
  },
  thumb: { width: "100%", aspectRatio: 4 / 3, borderRadius: 10, backgroundColor: "#111" },
  name: { color: colors.text.light, fontSize: 13, fontWeight: "700" },
  sub: { color: colors.text.secondary, fontSize: 11 },
  price: { color: colors.brand.trendyPink, fontSize: 13, fontWeight: "700", marginTop: 2 },
});
