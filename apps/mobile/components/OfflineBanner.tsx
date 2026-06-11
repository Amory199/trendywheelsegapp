import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNetwork } from "../lib/network-store";

const PING_INTERVAL_MS = 6000;
const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

// Slim banner pinned under the status bar whenever the API is unreachable.
// While shown, it pings /healthz so the banner clears itself the moment the
// connection comes back — no native NetInfo needed.
export function OfflineBanner(): React.JSX.Element | null {
  const online = useNetwork((s) => s.online);
  const setOnline = useNetwork((s) => s.setOnline);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (online) return;
    const timer = setInterval(() => {
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 4000);
      fetch(`${baseUrl}/healthz`, { signal: controller.signal })
        .then(() => setOnline(true))
        .catch(() => {
          /* still offline */
        })
        .finally(() => clearTimeout(abortTimer));
    }, PING_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [online, setOnline]);

  if (online) return null;
  return (
    <View style={[styles.banner, { top: insets.top }]} pointerEvents="none">
      <Text style={styles.text}>No connection — retrying…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: "#b91c1c",
    paddingVertical: 5,
    alignItems: "center",
  },
  text: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
