import { colors, spacing, typography } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { useT } from "../lib/locale";

export default function PrivacyPolicyScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>{t("components.privacy.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("components.privacy.title")}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>{t("components.privacy.lastUpdated")}</Text>

        <Text style={styles.sectionTitle}>{t("components.privacy.section1Title")}</Text>
        <Text style={styles.body}>{t("components.privacy.section1Body")}</Text>

        <Text style={styles.sectionTitle}>{t("components.privacy.section2Title")}</Text>
        <Text style={styles.body}>{t("components.privacy.section2Body")}</Text>

        <Text style={styles.sectionTitle}>{t("components.privacy.section3Title")}</Text>
        <Text style={styles.body}>{t("components.privacy.section3Body")}</Text>

        <Text style={styles.sectionTitle}>{t("components.privacy.section4Title")}</Text>
        <Text style={styles.body}>{t("components.privacy.section4Body")}</Text>

        <Text style={styles.sectionTitle}>{t("components.privacy.section5Title")}</Text>
        <Text style={styles.body}>{t("components.privacy.section5Body")}</Text>

        <Text style={styles.sectionTitle}>{t("components.privacy.section6Title")}</Text>
        <Text style={styles.body}>{t("components.privacy.section6Body")}</Text>

        <Text style={styles.sectionTitle}>{t("components.privacy.section7Title")}</Text>
        <Text style={styles.body}>
          {t("components.privacy.contactInquiries")}
          {"\n"}
          {t("components.privacy.contactLocation")}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing["2xl"],
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  back: { color: colors.primary[300], fontSize: typography.fontSize.body, width: 60 },
  headerTitle: {
    color: colors.text.light,
    fontSize: typography.fontSize.bodyLarge,
    fontWeight: typography.fontWeight.bold,
  },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  lastUpdated: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.text.light,
    fontSize: typography.fontSize.bodyLarge,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  body: { color: colors.text.secondary, fontSize: typography.fontSize.body, lineHeight: 22 },
});
