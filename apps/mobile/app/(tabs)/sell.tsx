import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography } from "@trendywheels/ui-tokens";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { getAccessToken } from "../../lib/api";

interface SaleListing {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: string;
  views: number;
}

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export default function SellScreen(): JSX.Element {
  const q = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const token = await getAccessToken();
      const res = await fetch(`${baseUrl}/api/sales`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load");
      return (await res.json()) as { data: SaleListing[] };
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        <Text style={styles.subtitle}>{q.data?.data.length ?? 0} listings</Text>
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.accent.DEFAULT} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={q.data?.data ?? []}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.brand} {item.model} · {item.year}
              </Text>
              <Text style={styles.price}>{Number(item.price).toLocaleString()} EGP</Text>
              <Text style={styles.meta}>{item.views} views</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: { paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: {
    fontSize: typography.fontSize.h1,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  subtitle: { color: colors.text.secondary, marginTop: 4 },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: spacing.md,
    borderColor: colors.dark.border,
    borderWidth: 1,
  },
  name: { color: colors.text.light, fontSize: 18, fontWeight: "700" },
  meta: { color: colors.text.secondary, marginTop: 4 },
  price: { color: colors.accent.DEFAULT, marginTop: 8, fontWeight: "700" },
});
