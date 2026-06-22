import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GuestGate } from "../../components/GuestGate";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { useTracking } from "../../lib/typography";

type Side = { uri: string | null; mime: string };

// National-ID verification. Captures the front and back of the customer's ID,
// uploads both to the "id-documents" prefix, and saves the URLs on the profile.
// Required once before any transaction; reused automatically afterwards. On
// success it resumes the original flow via the `next` route param.
export default function VerifyIdScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const track = useTracking();
  const params = useLocalSearchParams() as { next?: string; [k: string]: string | undefined };
  const { user, setUser } = useAuth();
  const [front, setFront] = useState<Side>({ uri: user?.idFrontUrl ?? null, mime: "image/jpeg" });
  const [back, setBack] = useState<Side>({ uri: user?.idBackUrl ?? null, mime: "image/jpeg" });

  const uploadIfLocal = async (side: Side): Promise<string | null> => {
    if (!side.uri) return null;
    if (!side.uri.startsWith("file:")) return side.uri; // already a remote URL
    const { uploadUrl, fileUrl } = await api.getUploadUrl(side.mime, "id-documents");
    const blob = await fetch(side.uri).then((r) => r.blob());
    await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": side.mime } });
    return fileUrl;
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const [idFrontUrl, idBackUrl] = await Promise.all([
        uploadIfLocal(front),
        uploadIfLocal(back),
      ]);
      const res = await api.updateUser(user.id, { idFrontUrl, idBackUrl });
      return res.data;
    },
    onSuccess: (u) => {
      setUser(u);
      const { next, ...rest } = params;
      if (next) router.replace({ pathname: next as never, params: rest as never });
      else router.back();
    },
    onError: (err) =>
      Alert.alert(t("verifyId.saveErrorTitle"), err instanceof Error ? err.message : ""),
  });

  const pick = async (set: (s: Side) => void): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      set({ uri: result.assets[0].uri, mime: result.assets[0].mimeType ?? "image/jpeg" });
    }
  };

  const canSave = !!front.uri && !!back.uri && !save.isPending;

  if (!user) return <GuestGate />;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("verifyId.title"),
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Ionicons name="id-card-outline" size={32} color={colors.brand.poolBlue} />
          <Text style={styles.title}>{t("verifyId.heading")}</Text>
          <Text style={styles.subtitle}>{t("verifyId.subtitle")}</Text>
        </View>

        <Text style={[styles.label, { letterSpacing: track(1) }]}>{t("verifyId.frontLabel")}</Text>
        <Pressable onPress={() => pick(setFront)} style={styles.photoBtn}>
          {front.uri ? (
            <Image source={{ uri: front.uri }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoEmpty}>
              <Ionicons name="camera-outline" size={30} color={colors.text.secondary} />
              <Text style={styles.photoEmptyText}>{t("verifyId.tapToUpload")}</Text>
            </View>
          )}
        </Pressable>

        <Text style={[styles.label, { letterSpacing: track(1) }]}>{t("verifyId.backLabel")}</Text>
        <Pressable onPress={() => pick(setBack)} style={styles.photoBtn}>
          {back.uri ? (
            <Image source={{ uri: back.uri }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoEmpty}>
              <Ionicons name="camera-outline" size={30} color={colors.text.secondary} />
              <Text style={styles.photoEmptyText}>{t("verifyId.tapToUpload")}</Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.privacy}>{t("verifyId.privacy")}</Text>

        <Pressable
          disabled={!canSave}
          onPress={() => save.mutate()}
          style={[styles.saveBtn, !canSave && { opacity: 0.4 }]}
        >
          {save.isPending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#000" />
              <Text style={styles.saveBtnText}>{t("verifyId.saveContinue")}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  scroll: { padding: 20, paddingBottom: 80, gap: 14 },
  intro: { alignItems: "center", gap: 8, marginBottom: 12 },
  title: { color: colors.text.light, fontSize: 20, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.text.secondary, fontSize: 13, textAlign: "center", lineHeight: 18 },
  label: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 4,
  },
  photoBtn: {
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderStyle: "dashed",
  },
  photo: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  photoEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  photoEmptyText: { color: colors.text.secondary, fontSize: 12 },
  privacy: { color: colors.text.secondary, fontSize: 11, lineHeight: 16, marginTop: 4 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand.poolBlue,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
  },
  saveBtnText: { color: "#000", fontWeight: "700" },
});
