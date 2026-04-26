import { colors, spacing, typography } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function PrivacyPolicyScreen(): JSX.Element {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: April 2026</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.body}>
          We collect your phone number for authentication, and optionally your name, email address, and profile photo. When you use our services we also collect booking history, vehicle interactions, and support communications.
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          Your data is used to provide vehicle rental, sales, and repair services; send booking confirmations and OTP codes; provide customer support; and improve our platform.
        </Text>

        <Text style={styles.sectionTitle}>3. Data Sharing</Text>
        <Text style={styles.body}>
          We do not sell your personal data. We share information only with service providers necessary to operate TrendyWheels (e.g. SMS delivery). All providers are bound by data processing agreements.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Retention</Text>
        <Text style={styles.body}>
          Account data is retained while your account is active. After deletion, personal data is anonymized within 30 days. Transactional records may be retained for up to 7 years for legal compliance.
        </Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.body}>
          You have the right to access, correct, or delete your personal data at any time. To export all your data, go to Profile → Settings → Export My Data. To delete your account, contact support@trendywheelseg.com.
        </Text>

        <Text style={styles.sectionTitle}>6. Security</Text>
        <Text style={styles.body}>
          All data is encrypted in transit (TLS 1.2+) and at rest. Authentication uses industry-standard JWT tokens. We never store passwords.
        </Text>

        <Text style={styles.sectionTitle}>7. Contact</Text>
        <Text style={styles.body}>
          For privacy inquiries: privacy@trendywheelseg.com{"\n"}
          TrendyWheels — Cairo, Egypt
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
  headerTitle: { color: colors.text.light, fontSize: typography.fontSize.bodyLarge, fontWeight: typography.fontWeight.bold },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  lastUpdated: { color: colors.text.secondary, fontSize: typography.fontSize.caption, marginBottom: spacing.xl },
  sectionTitle: {
    color: colors.text.light,
    fontSize: typography.fontSize.bodyLarge,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  body: { color: colors.text.secondary, fontSize: typography.fontSize.body, lineHeight: 22 },
});
