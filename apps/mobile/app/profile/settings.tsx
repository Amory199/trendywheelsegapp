import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import type { UserPreferences } from "@trendywheels/types";
import { borderRadius, colors, type Palette, spacing } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GuestGate } from "../../components/GuestGate";
import { logEvent } from "../../lib/analytics";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { applyLanguage, useLocale, useT } from "../../lib/locale";
import { useTracking } from "../../lib/typography";
import { useTheme } from "../../lib/use-theme";

type Theme = "dark" | "light" | "system";
type Language = "en" | "ar";

export default function SettingsScreen(): JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const t = useT();
  const track = useTracking();
  const router = useRouter();
  const { user, hydrate, logout } = useAuth();

  // Self-service account deletion (Apple/Google require it in-app, not via
  // email). Calls the API — which anonymizes the account, revokes sessions and
  // unbinds push — then signs out locally and returns to the login screen.
  const deleteAccountMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Not signed in");
      return api.deleteAccount(user.id);
    },
    onSuccess: async () => {
      logEvent("account_deleted");
      await logout();
      router.replace("/(auth)/phone");
    },
    onError: (err) =>
      Alert.alert(
        t("profile.settings.deleteFailedTitle"),
        err instanceof Error ? err.message : t("common.error"),
      ),
  });
  const prefs = user?.preferences;
  // The selector MUST reflect the language the app is actually rendering, which
  // is the live locale store (persisted in SecureStore) — NOT the server-cached
  // prefs.language, which can lag behind and showed "Arabic" while the UI was
  // English (then the global Save flipped it). The store is the single source
  // of truth for what the user sees, so mirror it. (INC-041)
  const activeLocale = useLocale((s) => s.locale);

  const [theme, setTheme] = useState<Theme>((prefs?.theme as Theme) ?? "dark");
  const [language, setLanguage] = useState<Language>(activeLocale);
  const [notifEmail, setNotifEmail] = useState(prefs?.notifications?.email ?? true);
  const [notifSms, setNotifSms] = useState(prefs?.notifications?.sms ?? true);
  const [notifPush, setNotifPush] = useState(prefs?.notifications?.push ?? true);
  const [notifWhatsapp, setNotifWhatsapp] = useState(prefs?.notifications?.whatsapp ?? false);
  const [marketingOptIn, setMarketingOptIn] = useState(prefs?.marketingOptIn ?? false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (prefs) {
      setTheme((prefs.theme as Theme) ?? "dark");
      // NOTE: language is intentionally NOT seeded from prefs here — it tracks
      // the live locale store below so the selector can never disagree with the
      // language the app is actually showing.
      setNotifEmail(prefs.notifications?.email ?? true);
      setNotifSms(prefs.notifications?.sms ?? true);
      setNotifPush(prefs.notifications?.push ?? true);
      setNotifWhatsapp(prefs.notifications?.whatsapp ?? false);
      setMarketingOptIn(prefs.marketingOptIn ?? false);
    }
  }, [prefs]);

  // Keep the selector pinned to the live locale (updates when SecureStore
  // hydration resolves, or after applyLanguage changes it).
  useEffect(() => {
    setLanguage(activeLocale);
  }, [activeLocale]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Not authenticated");
      const newPrefs: UserPreferences = {
        theme,
        language,
        notifications: {
          email: notifEmail,
          sms: notifSms,
          push: notifPush,
          whatsapp: notifWhatsapp,
        },
        marketingOptIn,
      };
      return api.updateUser(user.id, { preferences: newPrefs });
    },
    onSuccess: async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await hydrate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
  });

  const handleLanguageChange = async (lang: Language): Promise<void> => {
    if (lang === language) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguage(lang);
    logEvent("language_changed", { language: lang });
    // Save the preference to the API BEFORE applyLanguage — an en↔ar switch
    // flips layout direction and reloads the app, which would otherwise lose
    // the server-side save. Best-effort: an offline save still applies the
    // language locally (SecureStore persists it).
    if (user) {
      try {
        await api.updateUser(user.id, {
          preferences: { ...(prefs ?? {}), language: lang } as UserPreferences,
        });
      } catch {
        /* offline — local persistence still wins */
      }
    }
    // Persists the locale and, when the layout direction flips, reloads the
    // app (dev builds fall back to a restart prompt inside applyLanguage).
    await applyLanguage(lang);
  };

  if (!user) return <GuestGate />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("profile.settings.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <Animated.View entering={FadeInDown.delay(40).springify()}>
          <Text style={[styles.sectionTitle, { letterSpacing: track(1) }]}>
            {t("profile.settings.appearance")}
          </Text>
          <View style={styles.settingsCard}>
            {(["system", "light", "dark"] as Theme[]).map((themeOption, i) => (
              <View key={themeOption}>
                {i > 0 && <View style={styles.langDivider} />}
                <Pressable
                  style={[styles.langOption, theme === themeOption && styles.langOptionActive]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTheme(themeOption);
                  }}
                >
                  <View style={styles.settingIcon}>
                    <Ionicons
                      name={
                        themeOption === "system"
                          ? "phone-portrait-outline"
                          : themeOption === "light"
                            ? "sunny-outline"
                            : "moon-outline"
                      }
                      size={18}
                      color={colors.primary[400]}
                    />
                  </View>
                  <View style={styles.langInfo}>
                    <Text
                      style={[styles.langLabel, theme === themeOption && styles.langLabelActive]}
                    >
                      {themeOption === "system"
                        ? t("profile.settings.themeSystem")
                        : themeOption === "light"
                          ? t("profile.settings.themeLight")
                          : t("profile.settings.themeDark")}
                    </Text>
                    <Text style={styles.langHint}>
                      {themeOption === "system"
                        ? t("profile.settings.themeSystemHint")
                        : themeOption === "light"
                          ? t("profile.settings.themeLightHint")
                          : t("profile.settings.themeDarkHint")}
                    </Text>
                  </View>
                  {theme === themeOption && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accent.DEFAULT} />
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Language */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <Text style={[styles.sectionTitle, { letterSpacing: track(1) }]}>
            {t("profile.settings.language")}
          </Text>
          <View style={styles.settingsCard}>
            <Pressable
              style={[styles.langOption, language === "en" && styles.langOptionActive]}
              onPress={() => void handleLanguageChange("en")}
            >
              <Text style={styles.langFlag}>🇬🇧</Text>
              <View style={styles.langInfo}>
                <Text style={[styles.langLabel, language === "en" && styles.langLabelActive]}>
                  {t("profile.settings.english")}
                </Text>
                <Text style={styles.langHint}>{t("profile.settings.englishHint")}</Text>
              </View>
              {language === "en" && (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent.DEFAULT} />
              )}
            </Pressable>

            <View style={styles.langDivider} />

            <Pressable
              style={[styles.langOption, language === "ar" && styles.langOptionActive]}
              onPress={() => void handleLanguageChange("ar")}
            >
              <Text style={styles.langFlag}>🇪🇬</Text>
              <View style={styles.langInfo}>
                <Text style={[styles.langLabel, language === "ar" && styles.langLabelActive]}>
                  {t("profile.settings.arabic")}
                </Text>
                <Text style={styles.langHint}>{t("profile.settings.arabicHint")}</Text>
              </View>
              {language === "ar" && (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent.DEFAULT} />
              )}
            </Pressable>
          </View>
        </Animated.View>

        {/* Notifications */}
        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <Text style={[styles.sectionTitle, { letterSpacing: track(1) }]}>
            {t("profile.settings.notifications")}
          </Text>
          <View style={styles.settingsCard}>
            <ToggleRow
              icon="notifications-outline"
              label={t("profile.settings.pushTitle")}
              hint={t("profile.settings.pushHint")}
              value={notifPush}
              onChange={(v) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNotifPush(v);
              }}
            />
            <View style={styles.rowDivider} />
            <ToggleRow
              icon="mail-outline"
              label={t("profile.settings.emailTitle")}
              hint={t("profile.settings.emailHint")}
              value={notifEmail}
              onChange={(v) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNotifEmail(v);
              }}
            />
            <View style={styles.rowDivider} />
            <ToggleRow
              icon="chatbubble-outline"
              label={t("profile.settings.smsTitle")}
              hint={t("profile.settings.smsHint")}
              value={notifSms}
              onChange={(v) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNotifSms(v);
              }}
            />
            <View style={styles.rowDivider} />
            <ToggleRow
              icon="logo-whatsapp"
              label={t("profile.settings.whatsappTitle")}
              hint={t("profile.settings.whatsappHint")}
              value={notifWhatsapp}
              onChange={(v) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNotifWhatsapp(v);
              }}
            />
          </View>
        </Animated.View>

        {/* Marketing */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[styles.sectionTitle, { letterSpacing: track(1) }]}>
            {t("profile.settings.privacy")}
          </Text>
          <View style={styles.settingsCard}>
            <ToggleRow
              icon="megaphone-outline"
              label={t("profile.settings.marketingTitle")}
              hint={t("profile.settings.marketingHint")}
              value={marketingOptIn}
              onChange={(v) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMarketingOptIn(v);
              }}
            />
            <View style={styles.rowDivider} />
            <Pressable style={styles.settingRow} onPress={() => router.push("/privacy")}>
              <View style={styles.settingIcon}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary[400]} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>{t("profile.settings.privacyPolicy")}</Text>
                <Text style={styles.settingHint}>{t("profile.settings.privacyPolicyHint")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.muted} />
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable
              style={styles.settingRow}
              onPress={() => {
                if (!user) return;
                Alert.alert(
                  t("profile.settings.exportConfirmTitle"),
                  t("profile.settings.exportConfirmBody"),
                  [
                    { text: t("common.cancel"), style: "cancel" },
                    {
                      text: t("profile.settings.export"),
                      onPress: () =>
                        void Linking.openURL(
                          `https://api.trendywheelseg.com/api/users/${user.id}/export`,
                        ),
                    },
                  ],
                );
              }}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="download-outline" size={18} color={colors.primary[400]} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>{t("profile.settings.exportData")}</Text>
                <Text style={styles.settingHint}>{t("profile.settings.exportDataHint")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.muted} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Danger zone */}
        <Animated.View entering={FadeInDown.delay(220).springify()}>
          <Text style={[styles.sectionTitle, { letterSpacing: track(1) }]}>
            {t("profile.settings.account")}
          </Text>
          <View style={styles.settingsCard}>
            <Pressable
              style={styles.settingRow}
              onPress={() => {
                Alert.alert(
                  t("profile.settings.deleteAccount"),
                  t("profile.settings.deleteConfirmBody"),
                  [
                    { text: t("common.cancel"), style: "cancel" },
                    {
                      text: t("common.delete"),
                      style: "destructive",
                      onPress: () => {
                        Alert.alert(
                          t("profile.settings.deleteConfirmTitle2"),
                          t("profile.settings.deleteConfirmBody2"),
                          [
                            { text: t("common.cancel"), style: "cancel" },
                            {
                              text: t("profile.settings.deleteConfirmYes"),
                              style: "destructive",
                              onPress: () => deleteAccountMutation.mutate(),
                            },
                          ],
                        );
                      },
                    },
                  ],
                );
              }}
            >
              <View style={[styles.settingIcon, { backgroundColor: `${colors.error}22` }]}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.error }]}>
                  {t("profile.settings.deleteAccount")}
                </Text>
                <Text style={styles.settingHint}>{t("profile.settings.deleteAccountHint")}</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* App info */}
        <Animated.View entering={FadeInDown.delay(260).springify()} style={styles.appInfo}>
          <Text style={styles.appVersion}>TrendyWheels v1.0.0</Text>
          <Text style={styles.appCopy}>{t("profile.settings.appCopyright")}</Text>
        </Animated.View>

        {mutation.isError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={styles.errorText}>
              {(mutation.error as Error).message || t("profile.settings.saveFailed")}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Save button */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[
            styles.saveBtn,
            mutation.isPending && styles.saveBtnDisabled,
            saveSuccess && styles.saveBtnSuccess,
          ]}
          disabled={mutation.isPending}
          onPress={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color="#000" />
          ) : saveSuccess ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#000" />
              <Text style={styles.saveBtnText}>{t("profile.settings.saved")}</Text>
            </>
          ) : (
            <Text style={styles.saveBtnText}>{t("profile.settings.saveSettings")}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={18} color={colors.primary[400]} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: palette.border, true: `${colors.accent.DEFAULT}88` }}
        thumbColor={value ? colors.accent.DEFAULT : palette.muted}
      />
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.bg },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 56,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    headerTitle: { color: palette.text, fontSize: 16, fontWeight: "700" },

    sectionTitle: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      marginBottom: spacing.sm,
      paddingHorizontal: 2,
    },
    settingsCard: {
      backgroundColor: palette.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: "hidden",
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      gap: spacing.md,
    },
    settingIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${colors.primary[700]}22`,
      justifyContent: "center",
      alignItems: "center",
    },
    settingContent: { flex: 1 },
    settingLabel: { color: palette.text, fontSize: 14, fontWeight: "600" },
    settingHint: { color: palette.muted, fontSize: 12, marginTop: 1 },
    rowDivider: { height: 1, backgroundColor: palette.border, marginLeft: 64 },

    segmentSmall: {
      flexDirection: "row",
      backgroundColor: palette.bg,
      borderRadius: 8,
      padding: 3,
      gap: 3,
    },
    segmentBtn: {
      width: 32,
      height: 32,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    segmentBtnActive: { backgroundColor: colors.accent.DEFAULT },

    langOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      gap: spacing.md,
    },
    langOptionActive: { backgroundColor: `${colors.accent.DEFAULT}11` },
    langDivider: { height: 1, backgroundColor: palette.border },
    langFlag: { fontSize: 24 },
    langInfo: { flex: 1 },
    langLabel: { color: palette.muted, fontSize: 15, fontWeight: "600" },
    langLabelActive: { color: palette.text },
    langHint: { color: palette.muted, fontSize: 12, marginTop: 1 },

    appInfo: { alignItems: "center", gap: 4, paddingVertical: spacing.sm },
    appVersion: { color: palette.muted, fontSize: 12 },
    appCopy: { color: palette.muted, fontSize: 11 },

    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: `${colors.error}22`,
      borderRadius: 10,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: `${colors.error}44`,
    },
    errorText: { flex: 1, color: colors.error, fontSize: 13 },

    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.md,
      paddingBottom: 28,
      backgroundColor: palette.bg,
      borderTopWidth: 1,
      borderTopColor: palette.border,
    },
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: colors.accent.DEFAULT,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    saveBtnDisabled: { opacity: 0.45 },
    saveBtnSuccess: { backgroundColor: colors.success },
    saveBtnText: { color: "#000", fontWeight: "700", fontSize: 15 },
  });
}
