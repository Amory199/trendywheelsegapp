import { colors, spacing, typography, borderRadius, type Palette } from "@trendywheels/ui-tokens";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";

import { useAuth } from "../../lib/auth-store";
import { confirmFirebaseOtp } from "../../lib/firebase-phone-auth";
import { useT } from "../../lib/locale";
import { useTheme } from "../../lib/use-theme";

export default function OtpScreen(): JSX.Element {
  const router = useRouter();
  const { phone, mode } = useLocalSearchParams<{ phone: string; mode?: string }>();
  const verifyOtp = useAuth((s) => s.verifyOtp);
  const verifyFirebaseIdToken = useAuth((s) => s.verifyFirebaseIdToken);
  const t = useT();
  const { palette: p } = useTheme();
  const styles = useMemo(() => makeStyles(p), [p]);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (): Promise<void> => {
    setLoading(true);
    try {
      if (mode === "firebase") {
        const idToken = await confirmFirebaseOtp(otp);
        await verifyFirebaseIdToken(idToken);
      } else {
        await verifyOtp(phone ?? "", otp);
      }
      const u = useAuth.getState().user;

      if (u?.accountType === "admin") {
        router.replace("/admin/dashboard");
        return;
      }
      if (u?.staffRole === "sales") {
        router.replace("/crm/pipeline");
        return;
      }
      if (u?.staffRole === "support") {
        router.replace("/support/tickets");
        return;
      }
      if (u?.accountType === "customer" && !u.name) {
        router.replace("/(auth)/onboarding");
        return;
      }
      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert(
        t("auth.verificationFailed"),
        err instanceof Error ? err.message : t("common.tryAgain"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("auth.verifyTitle")}</Text>
        <Text style={styles.subtitle}>
          {t("auth.otpSentTo")} {phone}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor={p.muted}
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          maxLength={6}
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.button, (otp.length !== 6 || loading) && styles.buttonDisabled]}
          onPress={() => void handleVerify()}
          disabled={otp.length !== 6 || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? t("auth.verifying") : t("auth.verifyOtp")}
          </Text>
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
    },
    subtitle: {
      fontSize: typography.fontSize.body,
      color: p.muted,
      marginBottom: spacing["2xl"],
    },
    input: {
      width: "100%",
      height: 56,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      fontSize: typography.fontSize.h2,
      color: p.text,
      backgroundColor: p.card,
      marginBottom: spacing.lg,
      letterSpacing: 8,
    },
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
