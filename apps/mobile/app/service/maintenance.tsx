import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function MaintenanceScreen(): JSX.Element {
  const router = useRouter();
  return (
    <>
      <Stack.Screen
        options={{
          title: "Maintenance",
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <View style={styles.root}>
        <View style={styles.iconWrap}>
          <Ionicons name="build" size={48} color={colors.brand.poolBlue} />
        </View>
        <Text style={styles.title}>Maintenance — coming soon</Text>
        <Text style={styles.body}>
          Scheduled servicing for your vehicles is on the way. In the meantime, message support and
          we'll book you in by hand.
        </Text>
        <Pressable style={styles.cta} onPress={() => router.push("/messages")}>
          <Ionicons name="chatbubbles" size={16} color="#000" />
          <Text style={styles.ctaText}>Message support</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.brand.poolBlue}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.text.light, fontSize: 22, fontWeight: "800", textAlign: "center" },
  body: { color: colors.text.secondary, fontSize: 14, lineHeight: 21, textAlign: "center" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brand.poolBlue,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 12,
  },
  ctaText: { color: "#000", fontWeight: "700" },
});
