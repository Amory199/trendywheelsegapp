import { colors, spacing, typography, borderRadius, type Palette } from "@trendywheels/ui-tokens";
import * as Notifications from "expo-notifications";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";

import { BackButton } from "../../components/BackButton";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { confirmFirebaseOtp } from "../../lib/firebase-phone-auth";
import { useT } from "../../lib/locale";
import { useTheme } from "../../lib/use-theme";

const POLL_INTERVAL_MS = 4000;

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
  // When the Firebase SMS never arrives, support can issue a code out-of-band
  // (call / WhatsApp). That code lives in the server OTP table, so verifying it
  // takes the DB path, NOT Firebase — flipping this switches the screen over.
  const [useSupport, setUseSupport] = useState(false);

  // ── Manual-OTP request (in-app delivery) ──
  // A brand-new phone with no push token can't be reached by a server push, so
  // once the customer requests a manual code we POLL for it and, when the admin
  // issues it, auto-fill the field + raise a local notification.
  const [requesting, setRequesting] = useState(false);
  const [manualRequested, setManualRequested] = useState(false);
  const [manualExhausted, setManualExhausted] = useState(false);
  const requestIdRef = useRef<string | null>(null);

  const requestManualCode = async (): Promise<void> => {
    setRequesting(true);
    try {
      const res = await api.request<{ data: { requestId: string; status: string } }>(
        "POST",
        "/api/auth/otp-request",
        { body: { phone: phone ?? "" } },
      );
      requestIdRef.current = res.data.requestId;
      setManualRequested(true);
      setUseSupport(true); // issued code lives in the server OTP table (DB path)
    } catch (err) {
      // 409 → this phone already spent its one-time manual path.
      const status = (err as { status?: number; statusCode?: number })?.status;
      const msg = err instanceof Error ? err.message : "";
      if (status === 409 || /contact support/i.test(msg)) {
        setManualExhausted(true);
        Alert.alert(t("auth.verifyTitle"), t("auth.manualOtpExhausted"));
      } else {
        Alert.alert(t("auth.verifyTitle"), t("auth.manualOtpFailed"));
      }
    } finally {
      setRequesting(false);
    }
  };

  // Poll for the issued code while a manual request is outstanding and the field
  // isn't already filled. Stops on unmount, on fill, or when the code arrives.
  useEffect(() => {
    if (!manualRequested || otp.length === 6) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const id = requestIdRef.current;
      if (!id) return;
      try {
        const res = await api.request<{ data: { status: string; code: string | null } }>(
          "GET",
          `/api/auth/otp-request/${id}`,
        );
        if (cancelled) return;
        if (res.data.status === "issued" && res.data.code) {
          setOtp(res.data.code);
          setManualRequested(false);
          void Notifications.scheduleNotificationAsync({
            content: {
              title: t("auth.manualOtpArrivedTitle"),
              body: `${t("auth.manualOtpArrivedBody")} (${res.data.code})`,
            },
            trigger: null,
          }).catch(() => {});
        }
      } catch {
        // Transient poll failure — keep trying until unmount.
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [manualRequested, otp.length, t]);

  const handleVerify = async (): Promise<void> => {
    setLoading(true);
    try {
      if (mode === "firebase" && !useSupport) {
        const idToken = await confirmFirebaseOtp(otp);
        await verifyFirebaseIdToken(idToken);
      } else {
        await verifyOtp(phone ?? "", otp);
      }
      const u = useAuth.getState().user;

      // Land on the role home with a CLEAN stack. A guest browses /(tabs), taps
      // sign-in (pushing the auth screens on top), then logs in — so a plain
      // replace() leaves the customer catalog + auth screens underneath. Back
      // would then pop an admin/staff member into the customer interface with no
      // way out. dismissAll() clears that pre-auth history first. (INC-053)
      const land = (href: string): void => {
        if (router.canDismiss()) router.dismissAll();
        router.replace(href as never);
      };

      if (u?.accountType === "admin") {
        land("/admin/dashboard");
        return;
      }
      if (u?.staffRole === "sales") {
        land("/crm/pipeline");
        return;
      }
      if (u?.staffRole === "support") {
        land("/support/tickets");
        return;
      }
      if (u?.accountType === "customer" && !u.name) {
        land("/(auth)/onboarding");
        return;
      }
      land("/(tabs)");
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
          <BackButton style={{ marginLeft: -10, marginBottom: spacing.sm }} color={p.text} />
          <Text style={styles.title}>{t("auth.verifyTitle")}</Text>
          <Text style={styles.subtitle}>
            {useSupport ? t("auth.supportCodeHint") : `${t("auth.otpSentTo")} ${phone}`}
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

          {/* Manual-OTP request: if the SMS never arrives, the customer asks an
              admin to issue a code, which is delivered right back into this
              screen (poll + local notification). One-time per phone. */}
          {manualRequested ? (
            <Text style={styles.manualStatus}>{t("auth.manualOtpRequested")}</Text>
          ) : manualExhausted ? (
            <Text style={styles.manualStatus}>{t("auth.manualOtpExhausted")}</Text>
          ) : (
            <TouchableOpacity
              style={styles.supportLink}
              onPress={() => void requestManualCode()}
              disabled={requesting}
              activeOpacity={0.7}
            >
              <Text style={styles.supportLinkText}>
                {requesting ? t("auth.requestingManualOtp") : t("auth.requestManualOtp")}
              </Text>
            </TouchableOpacity>
          )}

          {/* Fallback shown only on the real-SMS (Firebase) path: if the code
              never arrives, let support issue one out-of-band and verify it. */}
          {mode === "firebase" && !useSupport ? (
            <TouchableOpacity
              style={styles.supportLink}
              onPress={() => setUseSupport(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.supportLinkText}>{t("auth.haveSupportCode")}</Text>
            </TouchableOpacity>
          ) : null}
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
    supportLink: { marginTop: spacing.lg, padding: spacing.sm },
    supportLinkText: {
      fontSize: typography.fontSize.body,
      color: p.pool,
      fontWeight: typography.fontWeight.semibold,
      textAlign: "center",
    },
    manualStatus: {
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
      fontSize: typography.fontSize.body,
      color: p.muted,
      textAlign: "center",
      lineHeight: 20,
    },
  });
}
