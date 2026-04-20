import { useQuery } from "@tanstack/react-query";
import type { Vehicle } from "@trendywheels/types";
import { colors, spacing, typography } from "@trendywheels/ui-tokens";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { api } from "../../lib/api";

export default function RentScreen(): JSX.Element {
  const q = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => api.getVehicles(),
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse Vehicles</Text>
        <Text style={styles.subtitle}>
          {q.isLoading ? "Loading…" : `${q.data?.data.length ?? 0} available`}
        </Text>
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.accent.DEFAULT} style={{ marginTop: 40 }} />
      ) : (
        <FlatList<Vehicle>
          data={q.data?.data ?? []}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.type} · {item.seating} seats · {item.transmission}
              </Text>
              <Text style={styles.price}>{Number(item.dailyRate).toLocaleString()} EGP / day</Text>
              <Text style={styles.location}>{item.location}</Text>
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
  location: { color: colors.text.secondary, marginTop: 2, fontSize: 12 },
});
