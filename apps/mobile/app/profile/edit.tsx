import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { borderRadius, colors, spacing } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

export default function ProfileEditScreen(): JSX.Element {
  const router = useRouter();
  const { user, hydrate } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setAvatarUri(user?.avatarUrl ?? null);
  }, [user]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      let newAvatarUrl = user.avatarUrl;

      // Upload new avatar if changed
      if (avatarChanged && avatarUri) {
        const mimeType = "image/jpeg";
        const { uploadUrl, fileUrl } = await api.getUploadUrl(mimeType, "avatars");
        const blob = await fetch(avatarUri).then((r) => r.blob());
        await fetch(uploadUrl, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": mimeType },
        });
        newAvatarUrl = fileUrl;
      }

      return api.updateUser(user.id, {
        name: name.trim(),
        email: email.trim() || null,
        avatarUrl: newAvatarUrl,
      });
    },
    onSuccess: async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await hydrate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
  });

  const pickAvatar = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarChanged(true);
    }
  };

  const hasChanges =
    name.trim() !== (user?.name ?? "") ||
    (email.trim() || null) !== user?.email ||
    avatarChanged;

  const initials = (user?.name ?? user?.phone ?? "?")[0].toUpperCase();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <Animated.View entering={FadeInDown.springify()} style={styles.avatarSection}>
          <Pressable style={styles.avatarWrap} onPress={() => void pickAvatar()}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color="#000" />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </Animated.View>

        {/* Form fields */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={colors.text.secondary}
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={80}
            />
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Optional"
              placeholderTextColor={colors.text.secondary}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              maxLength={120}
            />
          </View>

          <View style={styles.fieldDivider} />

          {/* Phone — read only */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{user?.phone ?? "—"}</Text>
              <Ionicons name="lock-closed-outline" size={14} color={colors.text.secondary} />
            </View>
            <Text style={styles.fieldHint}>Phone number cannot be changed</Text>
          </View>
        </Animated.View>

        {/* Account tier info */}
        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.tierCard}>
          <Ionicons name="star-outline" size={18} color={colors.warning} />
          <View style={styles.tierInfo}>
            <Text style={styles.tierTitle}>
              {(user?.loyaltyTier ?? "bronze").charAt(0).toUpperCase() +
                (user?.loyaltyTier ?? "bronze").slice(1)}{" "}
              Member
            </Text>
            <Text style={styles.tierPoints}>
              {(user?.loyaltyPoints ?? 0).toLocaleString()} points
            </Text>
          </View>
        </Animated.View>

        {mutation.isError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={styles.errorText}>
              {(mutation.error as Error).message || "Failed to save changes"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Save button */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[
            styles.saveBtn,
            (!hasChanges || mutation.isPending) && styles.saveBtnDisabled,
            saveSuccess && styles.saveBtnSuccess,
          ]}
          disabled={!hasChanges || mutation.isPending}
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
            <>
              <Ionicons name="save-outline" size={20} color="#000" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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

  avatarSection: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  avatarWrap: { position: "relative" },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary[700]}33`,
    borderWidth: 2,
    borderColor: colors.primary[700],
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { color: colors.text.light, fontSize: 36, fontWeight: "700" },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.dark.bg,
  },
  avatarHint: { color: colors.text.secondary, fontSize: 12 },

  formCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: "hidden",
  },
  fieldGroup: { padding: spacing.md, gap: 6 },
  fieldDivider: { height: 1, backgroundColor: colors.dark.border },
  fieldLabel: { color: colors.text.secondary, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    color: colors.text.light,
    fontSize: 15,
    paddingVertical: 6,
  },
  readOnlyField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  readOnlyText: { color: colors.text.secondary, fontSize: 15 },
  fieldHint: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },

  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.warning}33`,
  },
  tierInfo: { flex: 1 },
  tierTitle: { color: colors.text.light, fontSize: 14, fontWeight: "600" },
  tierPoints: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },

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
