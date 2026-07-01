import { colors, spacing, typography, borderRadius, type Palette } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { isTrialPhone, sendFirebaseOtp } from "../../lib/firebase-phone-auth";
import { useT } from "../../lib/locale";
import { useTheme } from "../../lib/use-theme";

const EGYPT_DIAL_CODE = "+20";
const LOGO = require("../../assets/brand-logo.png");

export default function PhoneScreen(): JSX.Element {
  const router = useRouter();
  const sendOtp = useAuth((s) => s.sendOtp);
  const t = useT();
  const { palette: p } = useTheme();
  const styles = useMemo(() => makeStyles(p), [p]);
  const [localPhone, setLocalPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [consented, setConsented] = useState(false);

  // Gentle continuous "breathing" on the logo — a calm brand moment on entry.
  const logoScale = useSharedValue(1);
  useEffect(() => {
    logoScale.value = withRepeat(
      withTiming(1.06, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [logoScale]);
  const logoAnim = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));

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
      // Registered accounts — any staff/admin, or a customer who already set a
      // password — sign in with email + password, not OTP. Route them straight
      // to the email login instead of sending a code that verifyOtp would reject.
      // Fail-open: if the check errors, fall through to OTP so signup never breaks.
      try {
        const { method } = await api.loginMethod(fullPhone);
        if (method === "password") {
          router.push("/(auth)/login-email");
          return;
        }
      } catch {
        /* network/blip — proceed with the normal OTP path */
      }

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Animated.View
            entering={FadeInDown.duration(550).springify().damping(14)}
            style={styles.logoWrap}
          >
            <Animated.View style={logoAnim}>
              <Image source={LOGO} style={styles.logo} contentFit="contain" transition={200} />
            </Animated.View>
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(120).duration(500)} style={styles.title}>
            {t("auth.welcome")}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
            {t("auth.phoneSubtitle")}
          </Animated.Text>

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

          {/* Escape hatch — the app is fully browsable without an account
              (Apple 5.1.1(v)). Sign-in is only for account actions, so login is
              never a dead end: a guest can always continue into the catalog. */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.replace("/(tabs)")}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>{t("auth.browseAsGuest")}</Text>
          </TouchableOpacity>

          {/* Returning users who already set a password skip OTP entirely. */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.push("/(auth)/login-email")}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>{t("auth.haveAccountLogin")}</Text>
          </TouchableOpacity>

          {/* Fallback when the SMS never arrives: support can issue a code
              out-of-band (call / WhatsApp) which is verified via the server OTP
              path, not Firebase. Requires a valid number first. */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              if (!localValid) {
                Alert.alert(t("auth.invalidNumberTitle"), t("auth.invalidNumberMessage"));
                return;
              }
              router.push({
                pathname: "/(auth)/otp",
                params: { phone: fullPhone, mode: "support" },
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>{t("auth.haveSupportCode")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: p.bg },
    container: {
      flexGrow: 1,
      backgroundColor: p.bg,
      justifyContent: "center",
      padding: spacing.lg,
    },
    content: { alignItems: "center" },
    logoWrap: { alignItems: "center", marginBottom: spacing.lg },
    logo: { width: 168, height: 98 },
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
    skipButton: {
      marginTop: spacing.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: "center",
    },
    skipText: {
      fontSize: typography.fontSize.bodyLarge,
      fontWeight: typography.fontWeight.semibold,
      color: p.blue,
      textDecorationLine: "underline",
    },
  });
}
