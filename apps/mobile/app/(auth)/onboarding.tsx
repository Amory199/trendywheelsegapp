import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { colors, spacing } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";

interface FormData {
  name: string;
  age: string; // string until submit, then parsed to int
  email: string;
}

export default function OnboardingScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const { user, hydrate } = useAuth();
  const [form, setForm] = useState<FormData>({
    name: user?.name ?? "",
    age: user?.age ? String(user.age) : "",
    email: user?.email ?? "",
  });

  const set = <K extends keyof FormData>(key: K, value: FormData[K]): void =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const ageNum = Number(form.age);
  const nameValid = form.name.trim().length >= 2;
  const ageValid = Number.isInteger(ageNum) && ageNum >= 13 && ageNum <= 120;
  const emailValid = form.email.trim() === "" || /^\S+@\S+\.\S+$/.test(form.email.trim());
  const canSubmit = nameValid && ageValid && emailValid;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      return api.updateUser(user.id, {
        name: form.name.trim(),
        age: ageNum,
        email: form.email.trim() || null,
      });
    },
    onSuccess: async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await hydrate();
      router.replace("/(tabs)");
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("components.onboarding.title")}</Text>
      </View>

      <Animated.View entering={FadeInDown.springify()} style={styles.body}>
        <Text style={styles.subtitle}>{t("components.onboarding.subtitle")}</Text>

        <Field
          label={t("components.onboarding.nameLabel")}
          placeholder={t("components.onboarding.namePlaceholder")}
          value={form.name}
          onChangeText={(v) => set("name", v)}
          autoCapitalize="words"
        />

        <Field
          label={t("components.onboarding.ageLabel")}
          placeholder={t("components.onboarding.agePlaceholder")}
          value={form.age}
          onChangeText={(v) => set("age", v.replace(/[^0-9]/g, "").slice(0, 3))}
          keyboardType="number-pad"
          maxLength={3}
        />

        <Field
          label={t("components.onboarding.emailLabel")}
          placeholder={t("components.onboarding.emailPlaceholder")}
          value={form.email}
          onChangeText={(v) => set("email", v)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {mutation.isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {(mutation.error as Error).message || t("components.onboarding.saveError")}
            </Text>
          </View>
        )}
      </Animated.View>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.cta, (!canSubmit || mutation.isPending) && styles.ctaDisabled]}
          disabled={!canSubmit || mutation.isPending}
          onPress={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Text style={styles.ctaText}>{t("components.onboarding.getStarted")}</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  ...props
}: {
  label: string;
} & React.ComponentProps<typeof TextInput>): JSX.Element {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.text.secondary} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: { color: colors.text.light, fontSize: 22, fontWeight: "700" },
  body: { padding: spacing.lg, gap: spacing.md },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  fieldLabel: { color: colors.text.secondary, fontSize: 12, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text.light,
    fontSize: 15,
  },
  errorBox: {
    backgroundColor: `${colors.error}22`,
    borderRadius: 8,
    padding: spacing.md,
  },
  errorText: { color: colors.error, fontSize: 13 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.dark.bg,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: 12,
    paddingVertical: 14,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: "#000", fontSize: 15, fontWeight: "700" },
});
