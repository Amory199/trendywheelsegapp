import { spacing, typography, borderRadius, colors, type Palette } from "@trendywheels/ui-tokens";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
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

// Step 2 of the password reset: verify the code, set the new password, and (on
// success) the store persists the returned session — so we auto-land the now
// signed-in user on "/" (the index router places them by role).
export default function ResetPasswordScreen(): JSX.Element {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const resetPassword = useAuth((s) => s.resetPassword);
  const t = useT();
  const { palette: p } = useTheme();
  const styles = useMemo(() => makeStyles(p), [p]);

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = code.length === 6 && password.length >= 8 && confirm.length >= 8 && !loading;

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordsDontMatch"));
      return;
    }
    setLoading(true);
    try {
      await resetPassword(phone ?? "", code, password);
      // The store persisted the returned tokens + user — clear the pre-auth
      // stack and land by role, exactly like a fresh login. (INC-053)
      if (router.canDismiss()) router.dismissAll();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.resetFailed"));
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
          <Text style={styles.title}>{t("auth.resetTitle")}</Text>
          <Text style={styles.subtitle}>{t("auth.resetSubtitle")}</Text>

          <Text style={styles.label}>{t("auth.resetCodeLabel")}</Text>
          <TextInput
            style={styles.input}
            placeholder="000000"
            placeholderTextColor={colors.text.placeholder}
            keyboardType="number-pad"
            value={code}
            onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
            maxLength={6}
          />

          <Text style={styles.label}>{t("auth.newPasswordLabel")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("auth.passwordPlaceholder")}
            placeholderTextColor={colors.text.placeholder}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>{t("auth.confirmPasswordLabel")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("auth.passwordPlaceholder")}
            placeholderTextColor={colors.text.placeholder}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={confirm}
            onChangeText={setConfirm}
            onSubmitEditing={() => canSubmit && void handleSubmit()}
          />

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
              <Text style={styles.buttonText}>{t("auth.resetCta")}</Text>
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
    input: {
      height: 46,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      fontSize: typography.fontSize.bodyLarge,
      color: p.text,
      backgroundColor: p.card,
      marginBottom: spacing.lg,
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
