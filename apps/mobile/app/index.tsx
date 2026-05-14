import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { useAuth } from "../lib/auth-store";

const LOADING_SRC = require("../assets/loading.webp");

export default function Index(): JSX.Element {
  const { user, initialized, hydrate } = useAuth();

  useEffect(() => {
    if (!initialized) void hydrate();
  }, [initialized, hydrate]);

  if (!initialized) {
    return (
      <View style={styles.splash}>
        <Image source={LOADING_SRC} style={styles.logo} contentFit="contain" transition={120} />
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
  logo: {
    width: "70%",
    aspectRatio: 4 / 5,
    maxWidth: 360,
    maxHeight: 450,
  },
});
