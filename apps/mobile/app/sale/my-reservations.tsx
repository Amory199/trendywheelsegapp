// Customer's reservation history — every for-sale vehicle they've reserved via
// /sale/[id], newest first. Reservations were previously invisible in the app
// (only orders + bookings had screens); this closes that gap.

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { Reservation } from "@trendywheels/types";
import { colors, type Palette } from "@trendywheels/ui-tokens";
import { Stack, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GuestGate } from "../../components/GuestGate";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { useTheme } from "../../lib/use-theme";

const STATUS_TINT: Record<string, string> = {
  pending: colors.brand.poolBlue,
  confirmed: colors.brand.friendlyBlue,
  completed: colors.brand.ecoLimelight,
  cancelled: "#888",
};

const STATUS_LABEL_KEY: Record<string, string> = {
  pending: "sale.statusPending",
  confirmed: "sale.statusConfirmed",
  completed: "sale.statusCompleted",
  cancelled: "sale.statusCancelled",
};

export default function MyReservations(): React.JSX.Element {
  const router = useRouter();
  const t = useT();
  const user = useAuth((s) => s.user);
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const q = useQuery({
    queryKey: ["my-reservations"],
    queryFn: () => api.getReservations().catch(() => ({ data: [] as Reservation[] })),
    enabled: !!user,
  });
  const reservations = (q.data?.data ?? []) as Reservation[];

  if (!user) return <GuestGate />;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("sale.myReservationsTitle"),
          headerStyle: { backgroundColor: palette.bg },
          headerTitleStyle: { color: palette.text },
          headerTintColor: palette.text,
        }}
      />
      {q.isLoading ? (
        <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator color={colors.brand.trendyPink} />
        </View>
      ) : (
        <FlatList<Reservation>
          style={styles.root}
          data={reservations}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 14, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching}
              onRefresh={() => q.refetch()}
              tintColor={palette.text}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={48} color={palette.muted} />
              <Text style={styles.emptyText}>{t("sale.noReservationsYet")}</Text>
              <Pressable style={styles.cta} onPress={() => router.push("/(tabs)/buy")}>
                <Text style={styles.ctaText}>{t("sale.browse")}</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const tint = STATUS_TINT[item.status] ?? "#888";
            const statusLabel = STATUS_LABEL_KEY[item.status]
              ? t(STATUS_LABEL_KEY[item.status])
              : item.status;
            return (
              <View style={styles.card}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.title}>{item.vehicle?.name ?? t("sale.forSale")}</Text>
                  <Text style={styles.meta}>
                    {t("sale.reservationNumberPrefix")}
                    {item.id.slice(0, 8)} · {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.amount}>
                    {t("sale.price")}: {Number(item.amountEgp).toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: tint }]}>
                  <Text style={styles.statusText}>{statusLabel}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },
    empty: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyText: { color: palette.muted, fontSize: 14 },
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
      backgroundColor: palette.card,
      borderRadius: 12,
      padding: 14,
    },
    title: { color: palette.text, fontSize: 15, fontWeight: "700" },
    meta: { color: palette.muted, fontSize: 12 },
    amount: { color: colors.brand.ecoLimelight, fontWeight: "700" },
    statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    statusText: { color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  });
}
