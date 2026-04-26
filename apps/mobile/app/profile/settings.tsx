import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import type { UserPreferences } from "@trendywheels/types";
import { borderRadius, colors, spacing } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

type Theme = "dark" | "light";
type Language = "en" | "ar";

export default function SettingsScreen(): JSX.Element {
  const router = useRouter();
  const { user, hydrate } = useAuth();
  const prefs = user?.preferences;

  const [theme, setTheme] = useState<Theme>(prefs?.theme ?? "dark");
  const [language, setLanguage] = useState<Language>(prefs?.language ?? "en");
  const [notifEmail, setNotifEmail] = useState(prefs?.notifications?.email ?? true);
  const [notifSms, setNotifSms] = useState(prefs?.notifications?.sms ?? true);
  const [notifPush, setNotifPush] = useState(prefs?.notifications?.push ?? true);
  const [notifWhatsapp, setNotifWhatsapp] = useState(prefs?.notifications?.whatsapp ?? false);
  const [marketingOptIn, setMarketingOptIn] = useState(prefs?.marketingOptIn ?? false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (prefs) {
      setTheme(prefs.theme ?? "dark");
      setLanguage(prefs.language ?? "en");
      setNotifEmail(prefs.notifications?.email ?? true);
      setNotifSms(prefs.notifications?.sms ?? true);
      setNotifPush(prefs.notifications?.push ?? true);
      setNotifWhatsapp(prefs.notifications?.whatsapp ?? false);
      setMarketingOptIn(prefs.marketingOptIn ?? false);
    }
  }, [prefs]);

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

  const handleLanguageChange = (lang: Language): void => {
    if (lang === language) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguage(lang);
    if (lang === "ar" && !I18nManager.isRTL) {
      Alert.alert(
        "Language Changed",
        "The app will switch to Arabic (RTL layout). Please restart the app for the change to take full effect.",
        [{ text: "OK" }],
      );
    } else if (lang === "en" && I18nManager.isRTL) {
      Alert.alert(
        "Language Changed",
        "The app will switch to English. Please restart the app for the change to take full effect.",
        [{ text: "OK" }],
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <Animated.View entering={FadeInDown.springify()}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="moon-outline" size={18} color={colors.primary[400]} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Theme</Text>
                <Text style={styles.settingHint}>
                  {theme === "dark" ? "Dark Mode" : "Light Mode"}
                </Text>
              </View>
              <View style={styles.segmentSmall}>
                <Pressable
                  style={[styles.segmentBtn, theme === "dark" && styles.segmentBtnActive]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTheme("dark");
                  }}
                >
                  <Ionicons
                    name="moon"
                    size={14}
                    color={theme === "dark" ? "#000" : colors.text.secondary}
                  />
                </Pressable>
                <Pressable
                  style={[styles.segmentBtn, theme === "light" && styles.segmentBtnActive]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTheme("light");
                  }}
                >
                  <Ionicons
                    name="sunny"
                    size={14}
                    color={theme === "light" ? "#000" : colors.text.secondary}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Language */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <Text style={styles.sectionTitle}>Language</Text>
          <View style={styles.settingsCard}>
            <Pressable
              style={[styles.langOption, language === "en" && styles.langOptionActive]}
              onPress={() => handleLanguageChange("en")}
            >
              <Text style={styles.langFlag}>🇬🇧</Text>
              <View style={styles.langInfo}>
                <Text style={[styles.langLabel, language === "en" && styles.langLabelActive]}>
                  English
                </Text>
                <Text style={styles.langHint}>Left-to-right</Text>
              </View>
              {language === "en" && (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent.DEFAULT} />
              )}
            </Pressable>

            <View style={styles.langDivider} />

            <Pressable
              style={[styles.langOption, language === "ar" && styles.langOptionActive]}
              onPress={() => handleLanguageChange("ar")}
            >
              <Text style={styles.langFlag}>🇪🇬</Text>
              <View style={styles.langInfo}>
                <Text style={[styles.langLabel, language === "ar" && styles.langLabelActive]}>
                  العربية
                </Text>
                <Text style={styles.langHint}>Right-to-left</Text>
              </View>
              {language === "ar" && (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent.DEFAULT} />
              )}
            </Pressable>
          </View>
        </Animated.View>

        {/* Notifications */}
        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingsCard}>
            <ToggleRow
              icon="notifications-outline"
              label="Push Notifications"
              hint="In-app alerts for bookings, messages"
              value={notifPush}
              onChange={(v) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNotifPush(v);
              }}
            />
            <View style={styles.rowDivider} />
            <ToggleRow
              icon="mail-outline"
              label="Email Notifications"
              hint="Booking confirmations, receipts"
              value={notifEmail}
              onChange={(v) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNotifEmail(v);
              }}
            />
            <View style={styles.rowDivider} />
            <ToggleRow
              icon="chatbubble-outline"
              label="SMS Alerts"
              hint="OTP, urgent updates"
              value={notifSms}
              onChange={(v) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNotifSms(v);
              }}
            />
            <View style={styles.rowDivider} />
            <ToggleRow
              icon="logo-whatsapp"
              label="WhatsApp Notifications"
              hint="Updates via WhatsApp"
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
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.settingsCard}>
            <ToggleRow
              icon="megaphone-outline"
              label="Marketing Communications"
              hint="Deals, promotions, and offers"
              value={marketingOptIn}
              onChange={(v) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMarketingOptIn(v);
              }}
            />
            <View style={styles.rowDivider} />
            <Pressable
              style={styles.settingRow}
              onPress={() => router.push("/privacy")}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary[400]} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
                <Text style={styles.settingHint}>How we handle your data</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable
              style={styles.settingRow}
              onPress={() => {
                if (!user) return;
                Alert.alert(
                  "Export My Data",
                  "Your data will be downloaded as a JSON file.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Export",
                      onPress: () => void Linking.openURL(`https://api.trendywheelseg.com/api/users/${user.id}/export`),
                    },
                  ],
                );
              }}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="download-outline" size={18} color={colors.primary[400]} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Export My Data</Text>
                <Text style={styles.settingHint}>Download all your personal data</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Danger zone */}
        <Animated.View entering={FadeInDown.delay(220).springify()}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsCard}>
            <Pressable
              style={styles.settingRow}
              onPress={() => {
                Alert.alert(
                  "Delete Account",
                  "This will permanently delete your account and anonymize all personal data. This cannot be undone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        Alert.alert(
                          "Are you sure?",
                          "Your bookings, messages, and all activity will be anonymized. You will be logged out.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Yes, delete my account",
                              style: "destructive",
                              onPress: () => void Linking.openURL("mailto:support@trendywheelseg.com?subject=Account%20Deletion%20Request"),
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
                <Text style={[styles.settingLabel, { color: colors.error }]}>Delete Account</Text>
                <Text style={styles.settingHint}>Permanently remove your data</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* App info */}
        <Animated.View entering={FadeInDown.delay(260).springify()} style={styles.appInfo}>
          <Text style={styles.appVersion}>TrendyWheels v1.0.0</Text>
          <Text style={styles.appCopy}>© 2026 TrendyWheels Egypt</Text>
        </Animated.View>

        {mutation.isError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={styles.errorText}>
              {(mutation.error as Error).message || "Failed to save settings"}
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
              <Text style={styles.saveBtnText}>Saved!</Text>
            </>
          ) : (
            <Text style={styles.saveBtnText}>Save Settings</Text>
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
        trackColor={{ false: colors.dark.border, true: `${colors.accent.DEFAULT}88` }}
        thumbColor={value ? colors.accent.DEFAULT : colors.text.secondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: { color: colors.text.light, fontSize: 16, fontWeight: "700" },

  sectionTitle: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  settingsCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
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
  settingLabel: { color: colors.text.light, fontSize: 14, fontWeight: "600" },
  settingHint: { color: colors.text.secondary, fontSize: 12, marginTop: 1 },
  rowDivider: { height: 1, backgroundColor: colors.dark.border, marginLeft: 64 },

  segmentSmall: {
    flexDirection: "row",
    backgroundColor: colors.dark.bg,
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
  langDivider: { height: 1, backgroundColor: colors.dark.border },
  langFlag: { fontSize: 24 },
  langInfo: { flex: 1 },
  langLabel: { color: colors.text.secondary, fontSize: 15, fontWeight: "600" },
  langLabelActive: { color: colors.text.light },
  langHint: { color: colors.text.secondary, fontSize: 12, marginTop: 1 },

  appInfo: { alignItems: "center", gap: 4, paddingVertical: spacing.sm },
  appVersion: { color: colors.text.secondary, fontSize: 12 },
  appCopy: { color: colors.text.secondary, fontSize: 11 },

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
    backgroundColor: colors.dark.bg,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
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
