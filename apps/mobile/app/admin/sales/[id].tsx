import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../../../lib/api";
import { playSound } from "../../../lib/sounds";

interface Listing {
  id: string;
  title: string;
  price?: number;
  status?: string;
  description?: string;
  images?: string[];
}

const STATUSES = ["active", "sold", "paused"];

export default function AdminSaleEdit(): React.JSX.Element {
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [form, setForm] = useState<Partial<Listing>>({});
  const [uploading, setUploading] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "sale", id],
    queryFn: async (): Promise<Listing> => {
      const r = await api.getSalesListing(id!);
      return (r as { data: Listing }).data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (q.data) setForm({ ...q.data, images: q.data.images ?? [] });
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => api.adminUpdateSale(id!, form),
    onSuccess: async () => {
      playSound("success");
      await qc.invalidateQueries({ queryKey: ["admin"] });
      Alert.alert("Saved", "Listing updated.");
    },
    onError: (e) => {
      playSound("error");
      Alert.alert("Save failed", e instanceof Error ? e.message : "Try again");
    },
  });

  const pickAndUpload = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - (form.images?.length ?? 0),
    });
    if (result.canceled || result.assets.length === 0) return;
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const asset of result.assets) {
        const mimeType = "image/jpeg";
        const { uploadUrl, fileUrl } = await api.getUploadUrl(mimeType, "sales");
        const blob = await fetch(asset.uri).then((r) => r.blob());
        await fetch(uploadUrl, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": mimeType },
        });
        uploadedUrls.push(fileUrl);
      }
      setForm((s) => ({ ...s, images: [...(s.images ?? []), ...uploadedUrls] }));
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number): void => {
    setForm((s) => ({ ...s, images: (s.images ?? []).filter((_, i) => i !== idx) }));
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: form.title ?? "Listing",
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <View style={styles.root}>
        {q.isLoading ? (
          <ActivityIndicator color={colors.brand.trendyPink} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 200, gap: 12 }}>
            <View style={styles.card}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                value={form.title ?? ""}
                onChangeText={(v) => setForm((s) => ({ ...s, title: v }))}
                style={styles.input}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Price (EGP)</Text>
              <TextInput
                value={form.price?.toString() ?? ""}
                onChangeText={(v) => setForm((s) => ({ ...s, price: Number(v) as never }))}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                value={form.description ?? ""}
                onChangeText={(v) => setForm((s) => ({ ...s, description: v }))}
                multiline
                style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              />
            </View>
            <View style={styles.card}>
              <View style={styles.imagesHeader}>
                <Text style={styles.label}>Images ({form.images?.length ?? 0}/10)</Text>
                <Pressable
                  onPress={() => void pickAndUpload()}
                  disabled={uploading || (form.images?.length ?? 0) >= 10}
                  style={[
                    styles.addBtn,
                    (uploading || (form.images?.length ?? 0) >= 10) && { opacity: 0.4 },
                  ]}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="add" size={16} color="#fff" />
                  )}
                  <Text style={styles.addBtnText}>{uploading ? "Uploading…" : "Add"}</Text>
                </Pressable>
              </View>
              {(form.images?.length ?? 0) === 0 ? (
                <Text style={styles.imagesHint}>No images yet — tap Add to upload up to 10.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(form.images ?? []).map((url, idx) => (
                      <View key={url + idx} style={styles.thumbWrap}>
                        <Image source={{ uri: url }} style={styles.thumb} contentFit="cover" />
                        <Pressable
                          style={styles.thumbRemove}
                          onPress={() => removeImage(idx)}
                          hitSlop={8}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.chipRow}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setForm((f) => ({ ...f, status: s }))}
                    style={[styles.chip, form.status === s && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, form.status === s && styles.chipTextActive]}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable
              style={[styles.saveBtn, save.isPending && { opacity: 0.5 }]}
              disabled={save.isPending}
              onPress={() => save.mutate()}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>{save.isPending ? "Saving…" : "Save"}</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
    gap: 8,
  },
  label: { color: colors.text.secondary, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  input: { color: colors.text.light, fontSize: 15, paddingVertical: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipActive: { backgroundColor: colors.brand.trendyPink, borderColor: colors.brand.trendyPink },
  chipText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  chipTextActive: { color: "#fff" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand.trendyPink,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  imagesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  imagesHint: { color: colors.text.secondary, fontSize: 12 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brand.friendlyBlue,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addBtnText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  thumbWrap: { position: "relative" },
  thumb: {
    width: 96,
    height: 72,
    borderRadius: 8,
    backgroundColor: colors.dark.bg,
  },
  thumbRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 999,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
