import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

export default function LicenseCaptureScreen(): JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams() as { next?: string; [k: string]: string | undefined };
  const { user, setUser } = useAuth();
  const [number, setNumber] = useState(user?.licenseNumber ?? "");
  const [expiry, setExpiry] = useState(user?.licenseExpiry ?? "");
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(user?.licensePhotoUrl ?? null);
  const [photoMimeType, setPhotoMimeType] = useState("image/jpeg");

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      let licensePhotoUrl: string | undefined = photoUri ?? undefined;
      // Upload new photo if it's a local URI
      if (photoUri && photoUri.startsWith("file:")) {
        const { uploadUrl, fileUrl } = await api.getUploadUrl(photoMimeType, "licenses");
        const blob = await fetch(photoUri).then((r) => r.blob());
        await fetch(uploadUrl, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": photoMimeType },
        });
        licensePhotoUrl = fileUrl;
      }
      const res = await api.updateUser(user.id, {
        licenseNumber: number.trim(),
        licenseExpiry: expiry || null,
        licensePhotoUrl: licensePhotoUrl ?? null,
      });
      return res.data;
    },
    onSuccess: (u) => {
      setUser(u);
      // Resume the original flow
      const { next, ...rest } = params;
      if (next) {
        router.replace({ pathname: next as never, params: rest as never });
      } else {
        router.back();
      }
    },
    onError: (err) =>
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Try again"),
  });

  async function pickPhoto(): Promise<void> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoMimeType(result.assets[0].mimeType ?? "image/jpeg");
    }
  }

  const canSave = number.trim().length >= 4 && !!expiry;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Driver's License",
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.intro}>
            <Ionicons name="card-outline" size={32} color={colors.brand.poolBlue} />
            <Text style={styles.title}>One step before you ride</Text>
            <Text style={styles.subtitle}>
              We need a valid driver's license on file to confirm rentals. Stored encrypted, shared
              only with the team that handles your booking.
            </Text>
          </View>

          <Text style={styles.label}>License number</Text>
          <TextInput
            value={number}
            onChangeText={setNumber}
            placeholder="e.g. 12345678"
            placeholderTextColor={colors.text.secondary}
            autoCapitalize="characters"
            style={styles.input}
          />

          <Text style={styles.label}>Expiry date</Text>
          <Pressable style={styles.input} onPress={() => setShowExpiryPicker(true)}>
            <Text
              style={{
                color: expiry ? colors.text.light : colors.text.secondary,
                fontSize: 15,
                lineHeight: 48,
              }}
            >
              {expiry ? new Date(expiry).toLocaleDateString() : "Tap to pick a date"}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.text.secondary}
              style={{ position: "absolute", right: 12, top: 15 }}
            />
          </Pressable>
          {showExpiryPicker ? (
            <DateTimePicker
              value={expiry ? new Date(expiry) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={(event: DateTimePickerEvent, selected?: Date) => {
                if (Platform.OS !== "ios") setShowExpiryPicker(false);
                if (event.type === "set" && selected) setExpiry(selected.toISOString());
              }}
            />
          ) : null}

          <Text style={styles.label}>Photo of your license</Text>
          <Pressable onPress={pickPhoto} style={styles.photoBtn}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={styles.photoEmpty}>
                <Ionicons name="camera-outline" size={32} color={colors.text.secondary} />
                <Text style={styles.photoEmptyText}>Tap to upload</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            disabled={!canSave || save.isPending}
            onPress={() => save.mutate()}
            style={[styles.saveBtn, (!canSave || save.isPending) && { opacity: 0.4 }]}
          >
            {save.isPending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#000" />
                <Text style={styles.saveBtnText}>Save and continue</Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} hitSlop={12} style={{ alignSelf: "center" }}>
            <Text style={styles.skip}>Not now</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  scroll: { padding: 20, paddingBottom: 80, gap: 14 },
  intro: { alignItems: "center", gap: 8, marginBottom: 12 },
  title: { color: colors.text.light, fontSize: 20, fontWeight: "800", textAlign: "center" },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  label: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
    color: colors.text.light,
    fontSize: 14,
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
  skip: { color: colors.text.secondary, fontSize: 13, marginTop: 8 },
});
