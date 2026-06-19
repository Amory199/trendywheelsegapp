import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { TradeIn } from "@trendywheels/types";
import { colors, type Palette, spacing } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";
import { useTheme } from "../../../lib/use-theme";

const W = Dimensions.get("window").width;
const HERO_H = Math.round(W * 0.7);

const STATUS_COLOR: Record<string, string> = {
  quoted: colors.success,
  accepted: colors.success,
  declined: colors.error,
  expired: colors.text.secondary,
  submitted: colors.warning,
  reviewing: colors.warning,
};

export default function TradeInDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const { data: ti, isLoading } = useQuery({
    queryKey: ["trade-in", id],
    queryFn: () => api.getTradeIn(id),
    select: (res) => res.data,
    enabled: !!id,
  });

  if (isLoading || !ti) {
    return (
      <View style={[styles.container, styles.center]}>
        {isLoading ? (
          <ActivityIndicator color={palette.muted} />
        ) : (
          <Text style={{ color: palette.muted }}>{t("sell.track.notFound")}</Text>
        )}
      </View>
    );
  }

  const item: TradeIn = ti;
  const tone = STATUS_COLOR[item.status] ?? palette.muted;
  const hasQuote = item.status === "quoted" && item.quoteEgp != null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          {item.photos?.[0] ? (
            <Image source={{ uri: item.photos[0] }} style={styles.heroImg} contentFit="cover" />
          ) : (
            <View style={[styles.heroImg, styles.center]}>
              <Ionicons name="swap-horizontal-outline" size={56} color={palette.muted} />
            </View>
          )}
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={[styles.statusBadge, { backgroundColor: tone }]}>
            <Text style={styles.statusText}>{t(`sell.track.status.${item.status}`)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.heading}>
            {item.brand} {item.model}
          </Text>
          <Text style={styles.sub}>
            {item.year} · {t(`sell.condition.${item.condition}`)}
          </Text>

          {hasQuote ? (
            <View style={styles.quoteBox}>
              <Text style={styles.quoteLabel}>{t("sell.track.quoteLabel")}</Text>
              <Text style={styles.quoteValue}>
                {Number(item.quoteEgp).toLocaleString()} {t("sell.egp")}
              </Text>
              {item.quoteValidUntil ? (
                <Text style={styles.quoteValid}>
                  {t("sell.track.validUntil")} {new Date(item.quoteValidUntil).toLocaleDateString()}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.pendingBox}>
              <Ionicons name="time-outline" size={18} color={palette.muted} />
              <Text style={styles.pendingText}>{t("sell.track.awaitingQuote")}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("sell.track.submittedOn")}</Text>
            <Text style={styles.infoValue}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>

          {item.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.infoLabel}>{t("sell.track.notesLabel")}</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.bg },
    center: { alignItems: "center", justifyContent: "center" },
    hero: { width: W, height: HERO_H, backgroundColor: palette.card, position: "relative" },
    heroImg: { width: W, height: HERO_H },
    backBtn: {
      position: "absolute",
      top: 52,
      left: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(2,1,31,0.45)",
      alignItems: "center",
      justifyContent: "center",
    },
    statusBadge: {
      position: "absolute",
      top: 56,
      right: 16,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    statusText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    body: { padding: spacing.lg, gap: spacing.sm },
    heading: { color: palette.text, fontSize: 24, fontWeight: "800" },
    sub: { color: palette.muted, fontSize: 14 },
    quoteBox: {
      backgroundColor: `${colors.success}18`,
      borderRadius: 14,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: `${colors.success}44`,
      marginTop: spacing.sm,
      gap: 2,
    },
    quoteLabel: {
      color: colors.success,
      fontSize: 11,
      fontWeight: "800",
      textTransform: "uppercase",
    },
    quoteValue: { color: palette.text, fontSize: 24, fontWeight: "800" },
    quoteValid: { color: palette.muted, fontSize: 12 },
    pendingBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: palette.card,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      marginTop: spacing.sm,
    },
    pendingText: { color: palette.muted, fontSize: 14, fontStyle: "italic" },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: palette.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    infoLabel: { color: palette.muted, fontSize: 13 },
    infoValue: { color: palette.text, fontSize: 14, fontWeight: "600" },
    notesBox: {
      backgroundColor: palette.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      padding: spacing.md,
      gap: 4,
    },
    notesText: { color: palette.text, fontSize: 14, lineHeight: 20 },
  });
}
