import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as React from "react";
import { Text, View } from "react-native";

import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";

import { TWButton } from "./ui";

// Shown in place of an account-gated screen when no user is signed in. Browsing
// the catalog stays open to guests (Apple guideline 5.1.1(v)); only account
// features (orders, bookings, selling, profile, messaging) funnel through here.
// `message` overrides the default body so each surface can say what it gates.
export function GuestGate({ message }: { message?: string }): React.JSX.Element {
  const router = useRouter();
  const t = useT();
  const { palette } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.bg,
        paddingTop: 100,
        paddingHorizontal: 28,
        alignItems: "center",
      }}
    >
      <Ionicons name="lock-closed-outline" size={44} color={palette.muted} />
      <Text
        style={{
          color: palette.text,
          fontSize: 20,
          fontWeight: "800",
          marginTop: 16,
          textAlign: "center",
        }}
      >
        {t("auth.guestTitle")}
      </Text>
      <Text
        style={{
          color: palette.muted,
          fontSize: 15,
          marginTop: 10,
          marginBottom: 24,
          textAlign: "center",
          lineHeight: 21,
        }}
      >
        {message ?? t("auth.guestBody")}
      </Text>
      <TWButton kind="pink" size="lg" onPress={() => router.push("/(auth)/phone")}>
        {t("auth.guestCta")}
      </TWButton>

      {/* Never a dead end (Apple 5.1.1(v)): account screens gate here, but the
          guest can always bounce back to free browsing instead of signing in. */}
      <Text
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
        style={{
          color: palette.muted,
          fontSize: 14,
          fontWeight: "700",
          marginTop: 18,
          textDecorationLine: "underline",
        }}
      >
        {t("auth.keepBrowsing")}
      </Text>
    </View>
  );
}
