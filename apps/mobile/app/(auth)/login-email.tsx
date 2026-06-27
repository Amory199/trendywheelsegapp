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

import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { useTheme } from "../../lib/use-theme";

// Credentials login. Customers who set an email + password at signup (and all
// staff/admin) sign in here instead of re-doing OTP every time. On success we
// bounce to "/" so the index router lands them by role.
export default function LoginEmailScreen(): JSX.Element {
  const router = useRouter();
  const loginWithPassword = useAuth((s) => s.loginWithPassword);
  const t = useT();
  const { palette: p } = useTheme();
  const styles = useMemo(() => makeStyles(p), [p]);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The identifier is the username — a phone number or an email. Don't gate the
  // button on a strict email regex anymore; just require something + a password.
  const canSubmit = identifier.trim().length > 0 && password.length >= 1 && !loading;

  const handleLogin = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await loginWithPassword(identifier.trim(), password);
      // Clear the pre-auth stack (guest catalog + auth screens) before landing
      // on the role home, so Back can't drop a staff/admin into the customer
      // interface they can't escape. (INC-053)
      if (router.canDismiss()) router.dismissAll();
      router.replace("/");
    } catch (err) {
      // The API now returns a specific reason + a machine code. Prefer a
      // localised string for the known cases (keeps Arabic), and fall back to
      // the server's own message — which is already a clear sentence — so the
      // user always learns what's actually wrong instead of "Login failed".
      const code = (err as { code?: string } | null)?.code;
      const byCode: Record<string, string> = {
        NO_ACCOUNT: t("auth.noAccount"),
        NO_PASSWORD_SET: t("auth.noPasswordSet"),
        WRONG_PASSWORD: t("auth.wrongPassword"),
        ACCOUNT_INACTIVE: t("auth.accountInactive"),
      };
      const serverMsg = err instanceof Error ? err.message : "";
      setError((code && byCode[code]) || serverMsg || t("auth.loginFailed"));
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
          <Text style={styles.title}>{t("auth.loginTitle")}</Text>
          <Text style={styles.subtitle}>{t("auth.loginSubtitle")}</Text>

          <Text style={styles.label}>{t("auth.identifierLabel")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("auth.identifierPlaceholder")}
            placeholderTextColor={colors.text.placeholder}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            value={identifier}
            onChangeText={setIdentifier}
          />

          <Text style={styles.label}>{t("auth.passwordLabel")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("auth.passwordPlaceholder")}
            placeholderTextColor={colors.text.placeholder}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={() => canSubmit && void handleLogin()}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={() => void handleLogin()}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>{t("auth.loginCta")}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.altLink}
            onPress={() => router.replace("/(auth)/phone")}
            activeOpacity={0.7}
          >
            <Text style={styles.altLinkText}>{t("auth.noAccountSignup")}</Text>
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
    altLink: { marginTop: spacing.lg, alignItems: "center", paddingVertical: spacing.sm },
    altLinkText: {
      fontSize: typography.fontSize.bodyLarge,
      fontWeight: typography.fontWeight.semibold,
      color: p.blue,
      textDecorationLine: "underline",
    },
  });
}
