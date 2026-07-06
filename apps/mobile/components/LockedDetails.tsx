import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import type * as React from "react";
import { Text, View } from "react-native";

import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";

import { TWButton, TWCard } from "./ui";

// The guest treatment for a listing's details/price block. The hero carousel
// stays fully visible above this (guests browse freely, Apple 5.1.1(v)); the
// specs, description, and price collapse into one tasteful locked card that
// invites sign-in. Used by rent / sale / buy detail screens so the gate looks
// identical everywhere.
export function LockedDetails(): React.JSX.Element {
  const router = useRouter();
  const t = useT();
  const { palette } = useTheme();

  return (
    <TWCard>
      <View style={{ alignItems: "center", paddingVertical: 14, paddingHorizontal: 6 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,0,101,0.10)",
          }}
        >
          <Ionicons name="lock-closed" size={26} color={colors.brand.trendyPink} />
        </View>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "800",
            color: palette.text,
            marginTop: 14,
            textAlign: "center",
          }}
        >
          {t("auth.lockedTitle")}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: palette.muted,
            marginTop: 8,
            marginBottom: 18,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {t("auth.lockedBody")}
        </Text>
        <TWButton
          kind="pink"
          size="lg"
          icon="arrow-forward"
          iconRight
          full
          onPress={() => router.push("/(auth)/phone")}
        >
          {t("auth.guestCta")}
        </TWButton>
      </View>
    </TWCard>
  );
}
