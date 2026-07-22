import { spacing, typography, borderRadius, colors, type Palette } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { BackButton } from "../../components/BackButton";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { useTheme } from "../../lib/use-theme";

const EGYPT_DIAL_CODE = "+20";

// Step 1 of the password reset: collect the phone, ask the API to send a code,
// then hand off to reset-password with the phone in the params.
export default function ForgotPasswordScreen(): JSX.Element {
  const router = useRouter();
  const requestPasswordReset = useAuth((s) => s.requestPasswordReset);
  const t = useT();
  const { palette: p } = useTheme();
  const styles = useMemo(() => makeStyles(p), [p]);

  const [localPhone, setLocalPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localValid = /^1[0-9]{9}$/.test(localPhone);
  const fullPhone = `${EGYPT_DIAL_CODE}${localPhone}`;
  const canSubmit = localValid && !loading;

  const handleSubmit = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(fullPhone);
      router.push({ pathname: "/(auth)/reset-password", params: { phone: fullPhone } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.forgotFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(500).springify().damping(14)}>
          <BackButton
            color={p.text}
            style={{ marginLeft: -8, marginBottom: 6 }}
            fallback="/(auth)/login-email"
          />
          <Text style={styles.title}>{t("auth.forgotTitle")}</Text>
          <Text style={styles.subtitle}>{t("auth.forgotSubtitle")}</Text>

          <Text style={styles.label}>{t("auth.identifierLabel")}</Text>
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
              onSubmitEditing={() => canSubmit && void handleSubmit()}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={() => void handleSubmit()}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>{t("auth.forgotCta")}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: p.bg },
    container: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
    title: {
      fontSize: typography.fontSize.h1,
      fontWeight: typography.fontWeight.bold,
      color: p.text,
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: typography.fontSize.bodyLarge,
      color: p.muted,
      marginBottom: spacing["2xl"],
    },
    label: {
      fontSize: typography.fontSize.caption,
      fontWeight: typography.fontWeight.semibold,
      color: p.muted,
      marginBottom: 6,
    },
    phoneRow: {
      flexDirection: "row",
      width: "100%",
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    dialChip: {
      height: 46,
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
      height: 46,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      fontSize: typography.fontSize.bodyLarge,
      color: p.text,
      backgroundColor: p.card,
    },
    error: { color: colors.error, fontSize: 13, marginBottom: spacing.md },
    button: {
      height: 46,
      borderRadius: borderRadius.md,
      backgroundColor: colors.brand.trendyPink,
      justifyContent: "center",
      alignItems: "center",
      marginTop: spacing.sm,
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: {
      fontSize: typography.fontSize.bodyLarge,
      fontWeight: typography.fontWeight.bold,
      color: "#fff",
    },
  });
}
