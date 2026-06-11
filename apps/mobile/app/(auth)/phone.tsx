import { colors, spacing, typography, borderRadius, type Palette } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Linking } from "react-native";

import { useAuth } from "../../lib/auth-store";
import { isTrialPhone, sendFirebaseOtp } from "../../lib/firebase-phone-auth";
import { useT } from "../../lib/locale";
import { useTheme } from "../../lib/use-theme";

const EGYPT_DIAL_CODE = "+20";

export default function PhoneScreen(): JSX.Element {
  const router = useRouter();
  const sendOtp = useAuth((s) => s.sendOtp);
  const t = useT();
  const { palette: p } = useTheme();
  const styles = useMemo(() => makeStyles(p), [p]);
  const [localPhone, setLocalPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [consented, setConsented] = useState(false);

  const localValid = /^1[0-9]{9}$/.test(localPhone);
  const fullPhone = `${EGYPT_DIAL_CODE}${localPhone}`;

  const handleSendOtp = async (): Promise<void> => {
    if (!consented) {
      Alert.alert(t("auth.requiredTitle"), t("auth.privacyRequired"));
      return;
    }
    if (!localValid) {
      Alert.alert(t("auth.invalidNumberTitle"), t("auth.invalidNumberMessage"));
      return;
    }
    setLoading(true);
    try {
      const useFirebase = !isTrialPhone(fullPhone);
      if (useFirebase) {
        await sendFirebaseOtp(fullPhone);
      } else {
        await sendOtp(fullPhone);
      }
      router.push({
        pathname: "/(auth)/otp",
        params: { phone: fullPhone, mode: useFirebase ? "firebase" : "trial" },
      });
    } catch (err) {
      Alert.alert(
        t("auth.otpSendFailed"),
        err instanceof Error ? err.message : t("common.tryAgain"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("auth.welcome")}</Text>
        <Text style={styles.subtitle}>{t("auth.phoneSubtitle")}</Text>

        <View style={styles.phoneRow}>
          <View style={styles.dialChip}>
            <Text style={styles.dialChipText}>{EGYPT_DIAL_CODE}</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="1XX XXX XXXX"
            placeholderTextColor={colors.text.placeholder}
            keyboardType="phone-pad"
            value={localPhone}
            onChangeText={(v) => setLocalPhone(v.replace(/[^0-9]/g, "").slice(0, 10))}
            maxLength={10}
          />
        </View>

        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setConsented((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, consented && styles.checkboxChecked]}>
            {consented && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.consentText}>
            {t("auth.privacyAgreePrefix")}{" "}
            <Text
              style={styles.consentLink}
              onPress={() => void Linking.openURL("https://app.trendywheelseg.com/legal/privacy")}
            >
              {t("auth.privacyPolicy")}
            </Text>{" "}
            {t("auth.privacyAgreeSuffix")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (!localValid || loading || !consented) && styles.buttonDisabled]}
          onPress={() => void handleSendOtp()}
          disabled={!localValid || loading || !consented}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{loading ? t("auth.sending") : t("auth.sendOtp")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: p.bg,
      justifyContent: "center",
      padding: spacing.lg,
    },
    content: { alignItems: "center" },
    title: {
      fontSize: typography.fontSize.h1,
      fontWeight: typography.fontWeight.bold,
      color: p.text,
      marginBottom: spacing.sm,
      textAlign: "center",
    },
    subtitle: {
      fontSize: typography.fontSize.bodyLarge,
      color: p.muted,
      marginBottom: spacing["2xl"],
      textAlign: "center",
    },
    phoneRow: {
      flexDirection: "row",
      width: "100%",
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    dialChip: {
      height: 44,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.card,
      justifyContent: "center",
      alignItems: "center",
    },
    dialChipText: {
      color: p.text,
      fontSize: typography.fontSize.bodyLarge,
      fontWeight: typography.fontWeight.bold,
    },
    phoneInput: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      fontSize: typography.fontSize.bodyLarge,
      color: p.text,
      backgroundColor: p.card,
    },
    consentRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      width: "100%",
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: p.border,
      borderRadius: 4,
      marginTop: 2,
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
    },
    checkboxChecked: {
      backgroundColor: colors.primary[700],
      borderColor: colors.primary[700],
    },
    checkmark: { color: "#fff", fontSize: 12, fontWeight: "700" },
    consentText: {
      flex: 1,
      fontSize: typography.fontSize.caption,
      color: p.muted,
      lineHeight: 18,
    },
    consentLink: { color: p.blue, textDecorationLine: "underline" },
    button: {
      width: "100%",
      height: 44,
      borderRadius: borderRadius.md,
      backgroundColor: colors.brand.trendyPink,
      justifyContent: "center",
      alignItems: "center",
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: {
      fontSize: typography.fontSize.bodyLarge,
      fontWeight: typography.fontWeight.bold,
      color: "#fff",
    },
  });
}
