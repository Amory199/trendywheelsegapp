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

  // Credential gate — runs for EVERY role before routing home. Anyone without a
  // password (or name) must set one: this is the re-credential path for a
  // locked-out staff/admin who just bootstrapped via OTP, and for a first-time
  // or OTP-only customer. The phone number is the username; email is optional.
  // An admin who is "acting as" another role keeps their own credentials, so
  // they skip this.
  if (!user.actingAsAdminId && (!user.hasPassword || !user.name)) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  // Role-aware cold-start routing. Admin → admin console. ANY staff member
  // (regardless of staffRole) → the unified staff hub (pipeline + inventory +
  // repairs + tickets). A staff person does all of these jobs.
  if (user.accountType === "admin") return <Redirect href="/admin/dashboard" />;
  if (user.accountType === "staff") return <Redirect href="/crm/pipeline" />;

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
