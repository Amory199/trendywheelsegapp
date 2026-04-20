import { colors, spacing, typography, borderRadius } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "../../lib/auth-store";

export default function ProfileScreen(): JSX.Element {
  const router = useRouter();
  const { user, hydrate, logout, initialized } = useAuth();

  useEffect(() => {
    if (!initialized) void hydrate();
  }, [initialized, hydrate]);

  const onLogout = async (): Promise<void> => {
    await logout();
    router.replace("/(auth)/phone");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      {user ? (
        <View style={styles.card}>
          <Row label="Name" value={user.name || "—"} />
          <Row label="Phone" value={user.phone} />
          <Row label="Account" value={user.accountType} />
          <Row label="Loyalty" value={`${user.loyaltyTier} (${user.loyaltyPoints} pts)`} />
        </View>
      ) : (
        <Text style={styles.muted}>Not signed in</Text>
      )}

      <TouchableOpacity style={styles.button} onPress={() => void onLogout()}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg, padding: spacing.lg, paddingTop: 60 },
  title: {
    fontSize: typography.fontSize.h1,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { color: colors.text.secondary },
  rowValue: { color: colors.text.light, fontWeight: "600" },
  muted: { color: colors.text.secondary },
  button: {
    marginTop: spacing.lg,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: { color: colors.text.light, fontWeight: "700" },
});
