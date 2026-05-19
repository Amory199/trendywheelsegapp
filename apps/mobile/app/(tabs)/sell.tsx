import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CategoryStrip } from "../../components/CategoryStrip";

export default function SellScreen(): JSX.Element {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Buy & Sell</Text>
          <Text style={styles.subtitle}>Pick a category to see listings</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => router.push("/sell/create")}>
          <Ionicons name="add" size={22} color="#000" />
          <Text style={styles.addBtnText}>List</Text>
        </Pressable>
      </View>

      <CategoryStrip
        value={null}
        onChange={(next) => router.push(`/sell/category/${next}` as never)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.h1,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  subtitle: { color: colors.text.secondary, fontSize: 13, marginTop: 4 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addBtnText: { color: "#000", fontWeight: "700", fontSize: 13 },
});
