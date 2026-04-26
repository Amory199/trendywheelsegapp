import { colors } from "@trendywheels/ui-tokens";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../lib/auth-store";

export default function Index(): JSX.Element {
  const { user, initialized, hydrate } = useAuth();

  useEffect(() => {
    if (!initialized) void hydrate();
  }, [initialized, hydrate]);

  if (!initialized) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="small" color={colors.accent.DEFAULT} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/phone" />;

  // First-time customers must finish onboarding (license required for rentals).
  if (user.accountType === "customer" && !user.licenseNumber) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
