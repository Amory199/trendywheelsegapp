import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { useAuth } from "../lib/auth-store";

const LOADING_SRC = require("../assets/loading.webp");

// Module-level flag so the intro reel plays exactly once per JS session
// (cold launch). Backgrounding + foregrounding the app keeps the flag set,
// so the user doesn't sit through the intro every time they return.
let hasPlayedIntro = false;

export default function Index(): JSX.Element {
  const { user, initialized, hydrate } = useAuth();

  useEffect(() => {
    if (!initialized) void hydrate();
  }, [initialized, hydrate]);

  if (!hasPlayedIntro) {
    hasPlayedIntro = true;
    return <Redirect href="/intro" />;
  }

  if (!initialized) {
    return (
      <View style={styles.splash}>
        <Image source={LOADING_SRC} style={styles.logo} contentFit="contain" transition={120} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/phone" />;

  // Role-aware cold-start routing — admins, sales, support each go straight to
  // their own native workspace; customers go to tabs.
  if (user.accountType === "admin") return <Redirect href="/admin/dashboard" />;
  if (user.staffRole === "sales") return <Redirect href="/crm/pipeline" />;
  if (user.staffRole === "support") return <Redirect href="/support/tickets" />;

  // First-time customers must finish onboarding (name is the gate now —
  // license is collected later when they actually try to rent).
  if (user.accountType === "customer" && !user.name) {
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
  logo: {
    width: "70%",
    aspectRatio: 4 / 5,
    maxWidth: 360,
    maxHeight: 450,
  },
});
