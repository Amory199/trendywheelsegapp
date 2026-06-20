import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../lib/auth-store";
import { useT } from "../lib/locale";

// Persistent top bar shown ONLY while an admin is "acting as" another role, so
// they always know they're in a preview and can drop back to admin in one tap.
// Mounted globally in app/_layout. Renders nothing when not acting.
export function ActingBanner(): JSX.Element | null {
  const actingAs = useAuth((s) => s.actingAs);
  const exitActing = useAuth((s) => s.exitActing);
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
      router.replace("/admin/dashboard");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <Text style={styles.text} numberOfLines={1}>
        👁 {t("roleSwitch.actingAs")} <Text style={styles.role}>{label}</Text>
      </Text>
      <Pressable onPress={() => void onExit()} hitSlop={8} style={styles.exitBtn}>
        <Text style={styles.exitText}>{busy ? "…" : t("roleSwitch.exit")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.brand.trendyPink,
  },
  text: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 },
  role: { fontWeight: "800", textTransform: "capitalize" },
  exitBtn: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginLeft: 10,
  },
  exitText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
