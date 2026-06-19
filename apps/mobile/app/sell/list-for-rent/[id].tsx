import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RentalListing } from "@trendywheels/types";
import { borderRadius, colors, type Palette, spacing } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
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
  approved: colors.success,
  declined: colors.error,
  submitted: colors.warning,
  reviewing: colors.warning,
  paused: colors.warning,
  withdrawn: colors.text.secondary,
};

// Owner-allowed withdraw transition (API: owners may set status -> withdrawn
// from any live state). Hidden once already withdrawn or declined.
const WITHDRAWABLE = new Set(["submitted", "reviewing", "approved", "paused"]);

export default function RentalDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const qc = useQueryClient();
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => api.getRentalListing(id),
    select: (res) => res.data,
    enabled: !!id,
  });

  const withdraw = useMutation({
    mutationFn: () => api.updateRentalListing(id, { status: "withdrawn" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-rentals"] });
      void qc.invalidateQueries({ queryKey: ["rental", id] });
      void qc.invalidateQueries({ queryKey: ["profile-rental-listings"] });
      router.back();
    },
    onError: (err) => {
      Alert.alert(t("sell.track.withdraw"), err instanceof Error ? err.message : "");
    },
  });

  const confirmWithdraw = (): void => {
    Alert.alert(t("sell.track.withdrawConfirmTitle"), t("sell.track.withdrawConfirmMessage"), [
      { text: t("sell.track.cancel"), style: "cancel" },
      { text: t("sell.track.withdraw"), style: "destructive", onPress: () => withdraw.mutate() },
    ]);
  };

  if (isLoading || !listing) {
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

  const l: RentalListing = listing;
  const tone = STATUS_COLOR[l.status] ?? palette.muted;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          {l.photos?.[0] ? (
            <Image source={{ uri: l.photos[0] }} style={styles.heroImg} contentFit="cover" />
          ) : (
            <View style={[styles.heroImg, styles.center]}>
              <Ionicons name="car-sport-outline" size={56} color={palette.muted} />
            </View>
          )}
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={[styles.statusBadge, { backgroundColor: tone }]}>
            <Text style={styles.statusText}>{t(`sell.track.status.${l.status}`)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.heading}>
            {l.brand} {l.model}
          </Text>
          <Text style={styles.sub}>
            {l.year} · {t(`home.categories.${l.category}`)}
          </Text>

          {l.dailyRateEgp != null ? (
            <Text style={styles.price}>
              {Number(l.dailyRateEgp).toLocaleString()} {t("sell.egp")}
              {t("sell.track.perDay")}
            </Text>
          ) : null}

          {l.status === "declined" && l.declineReason ? (
            <View style={styles.declineBox}>
              <Text style={styles.declineLabel}>{t("sell.track.declineReason")}</Text>
              <Text style={styles.declineText}>{l.declineReason}</Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("sell.track.conditionLabel")}</Text>
            <Text style={styles.infoValue}>{t(`sell.condition.${l.condition}`)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("sell.track.submittedOn")}</Text>
            <Text style={styles.infoValue}>{new Date(l.createdAt).toLocaleDateString()}</Text>
          </View>

          {l.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.infoLabel}>{t("sell.track.notesLabel")}</Text>
              <Text style={styles.notesText}>{l.notes}</Text>
            </View>
          ) : null}

          {WITHDRAWABLE.has(l.status) ? (
            <Pressable
              style={styles.withdrawBtn}
              onPress={confirmWithdraw}
              disabled={withdraw.isPending}
            >
              {withdraw.isPending ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                  <Text style={styles.withdrawText}>{t("sell.track.withdraw")}</Text>
                </>
              )}
            </Pressable>
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
    price: { color: colors.accent.DEFAULT, fontSize: 20, fontWeight: "800", marginTop: 4 },
    declineBox: {
      backgroundColor: `${colors.error}18`,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: `${colors.error}44`,
      marginTop: spacing.sm,
    },
    declineLabel: {
      color: colors.error,
      fontSize: 11,
      fontWeight: "800",
      textTransform: "uppercase",
    },
    declineText: { color: palette.text, fontSize: 14, marginTop: 4 },
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
    withdrawBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: `${colors.error}55`,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    withdrawText: { color: colors.error, fontWeight: "700", fontSize: 15 },
  });
}
