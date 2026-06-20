import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../lib/auth-store";

// The crisp brand lockup (same asset the <MobileIntro> overlay uses) on the
// brand-navy stage, with a quiet spinner. Replaces the old animated
// loading.webp — an 84-frame WebP that, upscaled on the boot screen, looked
// pixelated/glitchy and read as "broken" when the intro faded over it. (INC-045)
const LOGO = require("../assets/brand-logo.png");
const LOGO_RATIO = 720 / 416; // brand-logo.png native dimensions

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
        <Image source={LOGO} style={styles.logo} contentFit="contain" transition={120} />
        <ActivityIndicator color={colors.brand.poolBlue} style={styles.spinner} />
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
  if (
    user.accountType === "customer" &&
    !user.actingAsAdminId &&
    (!user.name || !user.email || !user.hasPassword)
  ) {
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
    width: "62%",
    aspectRatio: LOGO_RATIO,
    maxWidth: 280,
  },
  spinner: { marginTop: 28 },
});
