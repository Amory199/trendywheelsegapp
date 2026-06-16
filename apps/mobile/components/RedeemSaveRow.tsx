import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { LoyaltyTier } from "@trendywheels/types";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth-store";
import { useT } from "../lib/locale";
import { useDisplay, useTracking } from "../lib/typography";
import { useRequireAuth } from "../lib/use-require-auth";

const INK = "#02011F";
const MUTED = "rgba(2,1,31,0.55)";

const TIERS: readonly LoyaltyTier[] = ["bronze", "silver", "gold", "platinum"];

function normalizeTier(tier: string | null | undefined): LoyaltyTier {
  return TIERS.includes(tier as LoyaltyTier) ? (tier as LoyaltyTier) : "bronze";
}

/**
 * "Redeem & save" home row: a loyalty summary + an invite-and-earn shortcut.
 *
 * Guest-safe (Apple 5.1.1(v)) — home is the first screen a signed-out user
 * sees, so this NEVER walls. For a guest the whole row collapses to a single
 * inviting sign-in nudge that routes to phone login ONLY on tap (via
 * useRequireAuth), never on load; no /api/loyalty/me request fires for a guest
 * (enabled: !!user). This is the page's one and only sign-in nudge.
 *
 * Signed in: points/tier render SYNCHRONOUSLY from the auth user object (no
 * spinner/flash) and the ['loyalty-me'] query is refresh-only — when it
 * resolves we prefer its fresher points/tier (the endpoint returns points/tier,
 * NOT loyaltyPoints/loyaltyTier). A stale token never throws (.catch → null).
 */
export function RedeemSaveRow(): JSX.Element {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const t = useT();
  const display = useDisplay();
  const track = useTracking();

  // Refresh-only: skipped entirely for guests, and a dead/expired token falls
  // back to null rather than throwing on the home screen.
  const loyaltyQ = useQuery({
    queryKey: ["loyalty-me"],
    queryFn: () => api.getLoyaltyMe().catch(() => null),
    enabled: !!user,
  });

  // ── Guest: a single full-width sign-in invitation (tap-only nav) ──
  if (!user) {
    return (
      <View style={styles.wrap}>
        <Pressable
          style={({ pressed }) => [
            styles.guestCard,
            { backgroundColor: colors.brand.trendyPink + "12" },
            pressed && styles.pressed,
          ]}
          onPress={() => requireAuth()}
          android_ripple={{ color: "rgba(255,0,101,0.12)" }}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.brand.trendyPink + "1A" }]}>
            <Ionicons name="gift" size={26} color={colors.brand.trendyPink} />
          </View>
          <View style={styles.guestText}>
            <Text style={[styles.guestTitle, display(0.2)]} numberOfLines={2}>
              {t("home.redeemGuestTitle")}
            </Text>
          </View>
          <View style={[styles.guestPill, { backgroundColor: colors.brand.trendyPink }]}>
            <Text style={[styles.guestPillText, { letterSpacing: track(0.4) }]} numberOfLines={1}>
              {t("home.redeemGuestCta")}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  // ── Signed in: synchronous from user, refreshed from the query when ready ──
  const fresh = loyaltyQ.data?.data;
  const points = fresh ? Number(fresh.points) || 0 : (user.loyaltyPoints ?? 0);
  const tier = normalizeTier(fresh ? fresh.tier : user.loyaltyTier);

  return (
    <View style={[styles.wrap, styles.row]}>
      {/* Loyalty card → full LoyaltyCard lives on the profile tab */}
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.brand.ecoLimelight + "1A" },
          pressed && styles.pressed,
        ]}
        onPress={() => router.push("/(tabs)/profile")}
        android_ripple={{ color: "rgba(169,244,83,0.18)" }}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.brand.ecoLimelight + "33" }]}>
          <Ionicons name="medal" size={22} color={INK} />
        </View>
        <Text style={[styles.cardLabel, { letterSpacing: track(0.6) }]} numberOfLines={1}>
          {t("home.loyaltyTitle")}
        </Text>
        <Text style={[styles.points, display(0.3)]} numberOfLines={1}>
          {points.toLocaleString()}
        </Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          {t("home.loyaltyPoints")} · {t(`home.tier.${tier}` as never)}
        </Text>
      </Pressable>

      {/* Invite & earn → routes to profile (defensive useRequireAuth) */}
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.brand.poolBlue + "1A" },
          pressed && styles.pressed,
        ]}
        onPress={() => requireAuth(() => router.push("/(tabs)/profile"))}
        android_ripple={{ color: "rgba(0,199,234,0.18)" }}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.brand.poolBlue + "33" }]}>
          <Ionicons name="gift" size={22} color={colors.brand.poolBlue} />
        </View>
        <Text style={[styles.cardLabel, { letterSpacing: track(0.6) }]} numberOfLines={1}>
          {t("home.referTitle")}
        </Text>
        <Text style={[styles.referSub, display(0.2)]} numberOfLines={2}>
          {t("home.referSub")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 22 },
  row: { flexDirection: "row", gap: 12 },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    minHeight: 132,
    shadowColor: "#02011F",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: MUTED,
    textTransform: "uppercase",
  },
  points: { fontSize: 30, color: INK, marginTop: 2 },
  cardSub: { fontSize: 12, color: MUTED, marginTop: 2, fontWeight: "600" },
  referSub: { fontSize: 16, color: INK, marginTop: 4 },
  // Guest variant
  guestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#02011F",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  guestText: { flex: 1 },
  guestTitle: { fontSize: 16, color: INK },
  guestPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  guestPillText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
