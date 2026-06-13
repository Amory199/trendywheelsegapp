import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { useT } from "../lib/locale";

/**
 * Tap-to-search entry on the home feed. Looks like a field but routes to the
 * dedicated /search screen (Talabat pattern) where the real input lives — keeps
 * the home scroll light and the keyboard off until the user actually searches.
 */
export function HomeSearchBar(): JSX.Element {
  const router = useRouter();
  const t = useT();
  return (
    <Pressable
      onPress={() => router.push("/search")}
      style={({ pressed }) => [styles.bar, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name="search" size={18} color="rgba(2,1,31,0.45)" />
      <Text style={styles.placeholder}>{t("home.searchPlaceholder")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(2,1,31,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginHorizontal: 16,
    shadowColor: "#02011F",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  placeholder: { fontSize: 14, color: "rgba(2,1,31,0.45)" },
});
