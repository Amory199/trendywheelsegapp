import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { RentalListing, RentalListingStatus } from "@trendywheels/types";
import { borderRadius, colors, type Palette, spacing } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GuestGate } from "../../../components/GuestGate";
import { StatStrip } from "../../../components/StatStrip";
import { TWSkeletonCard } from "../../../components/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-store";
import { useT } from "../../../lib/locale";
import { useTheme } from "../../../lib/use-theme";

const STATUS_COLOR: Record<string, string> = {
  approved: colors.success,
  declined: colors.error,
  submitted: colors.warning,
  reviewing: colors.warning,
  paused: colors.warning,
  withdrawn: colors.text.secondary,
};

const ACTIVE: RentalListingStatus[] = ["approved"];
const PENDING: RentalListingStatus[] = ["submitted", "reviewing", "paused"];

export default function MyRentalsScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const { user } = useAuth();
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-rentals", user?.id],
    queryFn: () => api.getRentalListings(),
    select: (res) => res.data,
    enabled: !!user?.id,
  });

  const listings = data ?? [];
  const stats = useMemo(() => {
    const active = listings.filter((l) => ACTIVE.includes(l.status)).length;
    const pending = listings.filter((l) => PENDING.includes(l.status)).length;
    const closed = listings.length - active - pending;
    return [
      { label: t("sell.track.total"), value: listings.length },
      { label: t("sell.track.active"), value: active, tone: colors.success },
      { label: t("sell.track.pending"), value: pending, tone: colors.warning },
      { label: t("sell.track.closed"), value: closed, tone: palette.muted },
    ];
  }, [listings, t, palette]);

  if (!user) return <GuestGate />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={styles.title}>{t("sell.track.rentalsTitle")}</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push("/sell/list-for-rent")}>
          <Ionicons name="add" size={20} color="#000" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md, gap: spacing.md }}>
          <TWSkeletonCard height={110} />
          <TWSkeletonCard height={110} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="car-sport-outline" size={64} color={palette.muted} />
          <Text style={styles.emptyText}>{t("sell.track.rentalsEmpty")}</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push("/sell/list-for-rent")}>
            <Text style={styles.emptyBtnText}>{t("sell.track.rentalsEmptyCta")}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList<RentalListing>
          data={listings}
          keyExtractor={(l) => l.id}
          ListHeaderComponent={<StatStrip stats={stats} />}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingBottom: 40,
            gap: spacing.md,
          }}
          renderItem={({ item, index }) => {
            const tone = STATUS_COLOR[item.status] ?? palette.muted;
            return (
              <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <Pressable
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
                  onPress={() => router.push(`/sell/list-for-rent/${item.id}`)}
                >
                  <Image
                    source={{
                      uri:
                        item.photos?.[0] ??
                        "https://placehold.co/400x300/2B0FF8/FFFFFF?text=No+Photo",
                    }}
                    style={styles.cardImage}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.cardBody}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.brand} {item.model}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${tone}22` }]}>
                        <Text style={[styles.statusText, { color: tone }]}>
                          {t(`sell.track.status.${item.status}`)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardMeta}>
                      {item.year} · {t(`home.categories.${item.category}`)}
                    </Text>
                    {item.dailyRateEgp != null ? (
                      <Text style={styles.cardPrice}>
                        {Number(item.dailyRateEgp).toLocaleString()} {t("sell.egp")}
                        {t("sell.track.perDay")}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 56,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    title: { color: palette.text, fontSize: 18, fontWeight: "700" },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent.DEFAULT,
      justifyContent: "center",
      alignItems: "center",
    },
    empty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.xl,
    },
    emptyText: { color: palette.muted, fontSize: 14, textAlign: "center" },
    emptyBtn: {
      backgroundColor: colors.accent.DEFAULT,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      marginTop: spacing.sm,
    },
    emptyBtnText: { color: "#000", fontWeight: "700" },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: palette.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: "hidden",
      paddingRight: spacing.md,
    },
    cardImage: { width: 88, height: 88 },
    cardBody: { flex: 1, padding: spacing.md, gap: 4 },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    cardTitle: { flex: 1, color: palette.text, fontSize: 14, fontWeight: "700" },
    statusBadge: {
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
      alignSelf: "flex-start",
    },
    statusText: { fontSize: 9, fontWeight: "700" },
    cardMeta: { color: palette.muted, fontSize: 12 },
    cardPrice: { color: colors.accent.DEFAULT, fontSize: 14, fontWeight: "700" },
  });
}
