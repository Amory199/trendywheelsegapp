import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { useAuth } from "../lib/auth-store";

const LOADING_SRC = require("../assets/loading.webp");

// The cold-start brand animation is the <MobileIntro> overlay (SVG lockup),
// mounted in _layout.tsx — NOT a separate route. The old /intro mp4 reel was
// retired so the two never play on top of each other.
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

  // Guests land in the catalog and browse freely (Apple guideline 5.1.1(v) —
  // non-account features must not be gated behind login). Account actions
  // (buy, book, sell, profile, messaging) prompt sign-in at the point of use
  // via <GuestGate> / useRequireAuth.
  if (!user) return <Redirect href="/(tabs)" />;

  // Role-aware cold-start routing. Admin → admin console. ANY staff member
  // (regardless of staffRole — sales, support, inventory, mechanic, or none)
  // → the unified staff hub, which carries pipeline + inventory + repairs +
  // tickets + team in one place. A staff person does all of these jobs, so
  // there's no per-subrole split anymore — previously inventory/mechanic
  // staff fell through to the customer tabs.
  if (user.accountType === "admin") return <Redirect href="/admin/dashboard" />;
  if (user.accountType === "staff") return <Redirect href="/crm/pipeline" />;

  // First-time customers must finish onboarding: name + email + password are
  // required so they can sign in with credentials next time (OTP is first-time
  // only). Existing OTP-only customers are funnelled here on next launch to set
  // a password. License is still collected later, at first rent.
  if (user.accountType === "customer" && (!user.name || !user.email || !user.hasPassword)) {
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
