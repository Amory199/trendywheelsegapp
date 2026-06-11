import { colors } from "@trendywheels/ui-tokens";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../lib/api";

// Boot-time force-update gate. Compares the installed binary's version with
// /api/app-config's minSupportedVersion; below it, the app is blocked behind
// an "update required" screen with a store link. Lets us retire old binaries
// before a breaking API change ships (bump MIN_MOBILE_APP_VERSION in the API
// .env — no app release needed). Fail-open: any fetch/parse error renders
// nothing, the app must never be locked out by a config hiccup.

function isBelow(current: string, min: string): boolean {
  const a = current.split(".").map((n) => parseInt(n, 10) || 0);
  const b = min.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

export function UpdateGate(): React.JSX.Element | null {
  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAppConfig()
      .then(({ data }) => {
        const current = Constants.expoConfig?.version ?? "0.0.0";
        if (isBelow(current, data.minSupportedVersion)) {
          setStoreUrl(Platform.OS === "ios" ? data.iosStoreUrl : data.androidStoreUrl);
        }
      })
      .catch(() => {
        /* fail-open — never block the app on a config fetch error */
      });
  }, []);

  if (!storeUrl) return null;
  return (
    <View style={styles.root}>
      <Text style={styles.emoji}>⬆️</Text>
      <Text style={styles.title}>Update required</Text>
      <Text style={styles.body}>
        This version of TrendyWheels is no longer supported. Please update to keep booking, buying,
        and managing your carts.
      </Text>
      <Pressable style={styles.button} onPress={() => void Linking.openURL(storeUrl)}>
        <Text style={styles.buttonText}>Update now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    backgroundColor: colors.dark.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emoji: { fontSize: 48 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  body: { color: "#aaa", fontSize: 14, textAlign: "center", lineHeight: 20 },
  button: {
    marginTop: 12,
    backgroundColor: colors.brand.trendyPink,
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 999,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
