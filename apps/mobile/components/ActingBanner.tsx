import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../lib/auth-store";
import { useT } from "../lib/locale";

// Persistent top bar shown ONLY while an admin is "acting as" another role, so
// they always know they're in a preview and can drop back to admin in one tap.
// Mounted globally in app/_layout. Renders nothing when not acting.
export function ActingBanner(): JSX.Element | null {
  const actingAs = useAuth((s) => s.actingAs);
  const exitActing = useAuth((s) => s.exitActing);
  const logout = useAuth((s) => s.logout);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);

  if (!actingAs) return null;
  const label = (actingAs.staffRole ?? actingAs.role) as string;

  const onExit = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await exitActing();
      // Clear the previewed role's navigator before returning to admin, so Back
      // can't drop back into the customer/staff screens. (INC-053)
      if (router.canDismiss()) router.dismissAll();
      router.replace("/admin/dashboard");
    } catch {
      // Restoring the admin session failed (e.g. the refresh token expired while
      // acting). Never leave the admin stranded in the previewed interface: sign
      // out cleanly and send them to login so they can re-authenticate as admin.
      Alert.alert(t("roleSwitch.exitFailedTitle"), t("roleSwitch.exitFailedBody"));
      try {
        await logout();
      } catch {
        /* logout is best-effort; navigate regardless */
      }
      if (router.canDismiss()) router.dismissAll();
      router.replace("/(auth)/phone");
    } finally {
      setBusy(false);
    }
  };

  // Compact floating pill (not a full-width bar): sits just under the status
  // bar, only as wide as its content, so it never eats the header. The whole
  // pill is the exit target — big, obvious, one tap back to admin.
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }]}>
      <Pressable
        onPress={() => void onExit()}
        disabled={busy}
        hitSlop={6}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
      >
        <Text style={styles.eye}>👁</Text>
        <Text style={styles.label} numberOfLines={1}>
          {t("roleSwitch.actingAs")} <Text style={styles.role}>{label}</Text>
        </Text>
        <View style={styles.exitChip}>
          <Text style={styles.exitText}>{busy ? "…" : t("roleSwitch.exit")}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "92%",
    backgroundColor: colors.brand.trendyPink,
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  pillPressed: { opacity: 0.85 },
  eye: { fontSize: 13 },
  label: { color: "#fff", fontSize: 12.5, fontWeight: "600", flexShrink: 1 },
  role: { fontWeight: "800", textTransform: "capitalize" },
  exitChip: {
    backgroundColor: "rgba(255,255,255,0.26)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  exitText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
