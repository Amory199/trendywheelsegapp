import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import type * as React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useAuth } from "../lib/auth-store";
import { useT } from "../lib/locale";

// Single source of truth for "prices are for signed-in users". Wrap any price
// node with <PriceGate>: a signed-in user sees the real price; a guest sees a
// compact locked pill that routes to phone login. Because every price surface
// (home rails, catalog cards, detail screens) funnels through this one gate,
// prices flip to "sign in to see price" everywhere the instant a user signs out
// — no per-caller guest logic, no drift. Browsing stays fully open (Apple
// 5.1.1(v)); only the price and account actions are gated.
export function PriceGate({
  children,
  size = "sm",
}: {
  children: React.ReactNode;
  /** "lg" for detail-screen price rows, "sm" (default) for cards. */
  size?: "sm" | "lg";
}): React.JSX.Element {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const t = useT();

  if (user) return <>{children}</>;

  const lg = size === "lg";
  return (
    <Pressable
      onPress={() => router.push("/(auth)/phone")}
      hitSlop={6}
      style={({ pressed }) => [styles.pill, lg && styles.pillLg, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name="lock-closed" size={lg ? 14 : 11} color={colors.brand.trendyPink} />
      <Text style={[styles.text, lg && styles.textLg]} numberOfLines={1}>
        {t("auth.seePrice")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,0,101,0.10)",
  },
  pillLg: { paddingHorizontal: 12, paddingVertical: 8 },
  text: { color: colors.brand.trendyPink, fontSize: 12, fontWeight: "800" },
  textLg: { fontSize: 14 },
});
