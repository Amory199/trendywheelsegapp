import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { colors, spacing } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";

import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

interface FormData {
  name: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string; // YYYY-MM-DD
  licensePhotoUri: string | null;
}

const STEPS = ["Profile", "Driver's License", "Review"];

export default function OnboardingScreen(): JSX.Element {
  const router = useRouter();
  const { user, hydrate } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    licenseNumber: "",
    licenseExpiry: "",
    licensePhotoUri: null,
  });

  const set = <K extends keyof FormData>(key: K, value: FormData[K]): void =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      let licensePhotoUrl: string | null = null;
      if (form.licensePhotoUri) {
        const mimeType = "image/jpeg";
        const { uploadUrl, fileUrl } = await api.getUploadUrl(mimeType, "licenses");
        const blob = await fetch(form.licensePhotoUri).then((r) => r.blob());
        await fetch(uploadUrl, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": mimeType },
        });
        licensePhotoUrl = fileUrl;
      }

      return api.updateUser(user.id, {
        name: form.name.trim(),
        email: form.email.trim() || null,
        licenseNumber: form.licenseNumber.trim() || null,
        licenseExpiry: form.licenseExpiry
          ? new Date(form.licenseExpiry).toISOString()
          : null,
        licensePhotoUrl,
      });
    },
    onSuccess: async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await hydrate();
      router.replace("/(tabs)");
    },
  });

  const canProceed = (): boolean => {
    if (step === 0) return form.name.trim().length >= 2;
    if (step === 1) return form.licenseNumber.trim().length >= 3;
    return true;
  };

  const pickLicensePhoto = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      set("licensePhotoUri", result.assets[0].uri);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => (step > 0 ? setStep(step - 1) : router.back())}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.headerTitle}>Complete your profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.stepBar}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                i < step && styles.stepDone,
                i === step && styles.stepActive,
              ]}
            >
              {i < step ? (
                <Ionicons name="checkmark" size={14} color="#000" />
              ) : (
                <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>
                  {i + 1}
                </Text>
              )}
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, i < step && styles.stepLineDone]} />
            )}
          </View>
        ))}
      </View>
      <Text style={styles.stepLabel}>{STEPS[step]}</Text>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <Animated.View entering={FadeInRight.springify()} style={{ gap: spacing.md }}>
            <Text style={styles.helper}>
              Hi! Let&apos;s get you set up. Tell us your name and email so the team can reach
              you.
            </Text>
            <Field
              label="Full name *"
              placeholder="e.g. Mohamed Ghazaly"
              value={form.name}
              onChangeText={(v) => set("name", v)}
              autoCapitalize="words"
            />
            <Field
              label="Email (optional)"
              placeholder="you@example.com"
              value={form.email}
              onChangeText={(v) => set("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View entering={FadeInRight.springify()} style={{ gap: spacing.md }}>
            <Text style={styles.helper}>
              We need your driver&apos;s license to verify rentals. Photos are stored securely and
              only used for compliance.
            </Text>
            <Field
              label="License number *"
              placeholder="License ID"
              value={form.licenseNumber}
              onChangeText={(v) => set("licenseNumber", v)}
              autoCapitalize="characters"
            />
            <Field
              label="Expiry date (YYYY-MM-DD)"
              placeholder="2030-12-31"
              value={form.licenseExpiry}
              onChangeText={(v) => set("licenseExpiry", v)}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.fieldLabel}>License photo</Text>
            {form.licensePhotoUri ? (
              <View style={styles.licenseThumb}>
                <Image
                  source={{ uri: form.licensePhotoUri }}
                  style={styles.thumbImage}
                  contentFit="cover"
                />
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => set("licensePhotoUri", null)}
                >
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.addPhotoBtn} onPress={() => void pickLicensePhoto()}>
                <Ionicons name="camera-outline" size={28} color={colors.text.secondary} />
                <Text style={styles.addPhotoText}>Tap to upload license photo</Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeInRight.springify()} style={{ gap: spacing.md }}>
            <ReviewRow label="Name" value={form.name} />
            <ReviewRow label="Email" value={form.email || "—"} />
            <ReviewRow label="License #" value={form.licenseNumber} />
            <ReviewRow label="Expires" value={form.licenseExpiry || "—"} />
            <ReviewRow
              label="License photo"
              value={form.licensePhotoUri ? "Uploaded" : "Not uploaded"}
            />
            {mutation.isError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {(mutation.error as Error).message || "Failed to save profile"}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        {step < STEPS.length - 1 ? (
          <Pressable
            style={[styles.nextBtn, !canProceed() && styles.btnDisabled]}
            disabled={!canProceed()}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setStep(step + 1);
            }}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" />
          </Pressable>
        ) : (
          <Pressable
            style={[styles.nextBtn, mutation.isPending && styles.btnDisabled]}
            disabled={mutation.isPending}
            onPress={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>Get started</Text>
                <Ionicons name="checkmark-circle-outline" size={18} color="#000" />
              </>
            )}
          </Pressable>
        )}
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

function ReviewRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
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

  stepBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepItem: { flex: 1, flexDirection: "row", alignItems: "center" },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDone: { backgroundColor: colors.accent.DEFAULT, borderColor: colors.accent.DEFAULT },
  stepActive: { borderColor: colors.accent.DEFAULT },
  stepNum: { color: colors.text.secondary, fontSize: 12, fontWeight: "700" },
  stepNumActive: { color: colors.accent.DEFAULT },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.dark.border, marginHorizontal: 4 },
  stepLineDone: { backgroundColor: colors.accent.DEFAULT },
  stepLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  helper: { color: colors.text.secondary, fontSize: 13, lineHeight: 18 },
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

  licenseThumb: {
    width: "100%",
    aspectRatio: 1.6,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.dark.card,
  },
  thumbImage: { width: "100%", height: "100%" },
  removeBtn: { position: "absolute", top: 8, right: 8 },
  addPhotoBtn: {
    width: "100%",
    aspectRatio: 1.6,
    borderRadius: 10,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  addPhotoText: { color: colors.text.secondary, fontSize: 12, fontWeight: "600" },

  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  reviewLabel: { color: colors.text.secondary, fontSize: 13 },
  reviewValue: { color: colors.text.light, fontSize: 13, fontWeight: "600" },
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
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnDisabled: { opacity: 0.4 },
  nextBtnText: { color: "#000", fontSize: 15, fontWeight: "700" },
});
