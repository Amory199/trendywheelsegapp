import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { borderRadius, colors, spacing } from "@trendywheels/ui-tokens";
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
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

import { api } from "../../lib/api";

type Transmission = "automatic" | "manual";
type FuelType = "electric" | "gasoline" | "hybrid";

interface FormData {
  title: string;
  make: string;
  model: string;
  year: string;
  price: string;
  mileage: string;
  transmission: Transmission;
  fuelType: FuelType;
  color: string;
  description: string;
  images: string[]; // local URIs during creation
}

const STEPS = ["Basic Info", "Vehicle Details", "Photos", "Review"];

const TRANSMISSIONS: Transmission[] = ["automatic", "manual"];
const FUEL_TYPES: FuelType[] = ["gasoline", "electric", "hybrid"];

export default function SellCreateScreen(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    title: "",
    make: "",
    model: "",
    year: String(new Date().getFullYear()),
    price: "",
    mileage: "",
    transmission: "automatic",
    fuelType: "gasoline",
    color: "",
    description: "",
    images: [],
  });

  const set = (key: keyof FormData, value: string | string[]): void =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: async () => {
      // Upload images first, then create listing
      const uploadedUrls: string[] = [];
      for (const localUri of form.images) {
        try {
          const mimeType = "image/jpeg";
          const { uploadUrl, fileUrl } = await api.getUploadUrl(mimeType, "sales");
          const blob = await fetch(localUri).then((r) => r.blob());
          await fetch(uploadUrl, {
            method: "PUT",
            body: blob,
            headers: { "Content-Type": mimeType },
          });
          uploadedUrls.push(fileUrl);
        } catch {
          // If upload fails, skip this image
        }
      }

      return api.createSalesListing({
        title: form.title,
        make: form.make,
        model: form.model,
        year: parseInt(form.year, 10),
        price: parseFloat(form.price),
        mileage: parseInt(form.mileage, 10),
        transmission: form.transmission,
        fuelType: form.fuelType,
        color: form.color,
        description: form.description,
        images: uploadedUrls,
        status: "active",
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: ["sales-listings"] });
      void qc.invalidateQueries({ queryKey: ["my-listings"] });
      router.replace("/sell/my-listings");
    },
  });

  const canProceed = (): boolean => {
    if (step === 0) return !!(form.title.trim() && form.make.trim() && form.model.trim() && form.year);
    if (step === 1) return !!(form.price && form.mileage && form.color.trim());
    if (step === 2) return true; // images optional
    return true;
  };

  const pickImage = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });
    if (!result.canceled && result.assets.length) {
      const uris = result.assets.map((a) => a.uri);
      set("images", [...form.images, ...uris].slice(0, 10));
    }
  };

  const removeImage = (idx: number): void => {
    set("images", form.images.filter((_, i) => i !== idx));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => (step > 0 ? setStep(step - 1) : router.back())}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.headerTitle}>List a Car</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step indicator */}
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
        {/* Step 0 — Basic Info */}
        {step === 0 && (
          <Animated.View entering={FadeInRight.springify()} style={{ gap: spacing.md }}>
            <Field
              label="Listing Title *"
              placeholder="e.g. 2021 Toyota Camry — Low Mileage"
              value={form.title}
              onChangeText={(v) => set("title", v)}
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Make *"
                  placeholder="Toyota"
                  value={form.make}
                  onChangeText={(v) => set("make", v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Model *"
                  placeholder="Camry"
                  value={form.model}
                  onChangeText={(v) => set("model", v)}
                />
              </View>
            </View>
            <Field
              label="Year *"
              placeholder="2021"
              value={form.year}
              onChangeText={(v) => set("year", v)}
              keyboardType="numeric"
              maxLength={4}
            />
          </Animated.View>
        )}

        {/* Step 1 — Vehicle Details */}
        {step === 1 && (
          <Animated.View entering={FadeInRight.springify()} style={{ gap: spacing.md }}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Price (EGP) *"
                  placeholder="250000"
                  value={form.price}
                  onChangeText={(v) => set("price", v)}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Mileage (km) *"
                  placeholder="45000"
                  value={form.mileage}
                  onChangeText={(v) => set("mileage", v)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <SegmentField
              label="Transmission *"
              options={TRANSMISSIONS}
              value={form.transmission}
              onChange={(v) => set("transmission", v as Transmission)}
            />

            <SegmentField
              label="Fuel Type *"
              options={FUEL_TYPES}
              value={form.fuelType}
              onChange={(v) => set("fuelType", v as FuelType)}
            />

            <Field
              label="Color *"
              placeholder="White"
              value={form.color}
              onChangeText={(v) => set("color", v)}
            />

            <View>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.description}
                onChangeText={(v) => set("description", v)}
                placeholder="Describe your vehicle's condition, features, history…"
                placeholderTextColor={colors.text.secondary}
                multiline
                numberOfLines={5}
                maxLength={1000}
              />
              <Text style={styles.charCount}>{form.description.length}/1000</Text>
            </View>
          </Animated.View>
        )}

        {/* Step 2 — Photos */}
        {step === 2 && (
          <Animated.View entering={FadeInRight.springify()} style={{ gap: spacing.md }}>
            <View style={styles.photosHint}>
              <Ionicons name="images-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.photosHintText}>
                Add up to 10 photos. First photo will be the cover image.
              </Text>
            </View>

            <View style={styles.photosGrid}>
              {form.images.map((uri, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.thumbImage} contentFit="cover" />
                  {i === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                  <Pressable style={styles.removeBtn} onPress={() => removeImage(i)}>
                    <Ionicons name="close-circle" size={22} color={colors.error} />
                  </Pressable>
                </View>
              ))}

              {form.images.length < 10 && (
                <Pressable style={styles.addPhotoBtn} onPress={() => void pickImage()}>
                  <Ionicons name="camera-outline" size={28} color={colors.text.secondary} />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <Animated.View entering={FadeInRight.springify()} style={{ gap: spacing.md }}>
            <ReviewRow label="Title" value={form.title} />
            <ReviewRow label="Make / Model" value={`${form.make} ${form.model}`} />
            <ReviewRow label="Year" value={form.year} />
            <ReviewRow label="Price" value={`${Number(form.price).toLocaleString()} EGP`} />
            <ReviewRow label="Mileage" value={`${Number(form.mileage).toLocaleString()} km`} />
            <ReviewRow label="Transmission" value={form.transmission} />
            <ReviewRow label="Fuel" value={form.fuelType} />
            <ReviewRow label="Color" value={form.color} />
            <ReviewRow label="Photos" value={`${form.images.length} photo(s)`} />

            {mutation.isError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {(mutation.error as Error).message || "Failed to create listing"}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
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
                <Text style={styles.nextBtnText}>Publish Listing</Text>
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
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.text.secondary}
        {...props}
      />
    </View>
  );
}

function SegmentField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.segment}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            style={[styles.segmentOption, opt === value && styles.segmentOptionActive]}
            onPress={() => onChange(opt)}
          >
            <Text
              style={[styles.segmentText, opt === value && styles.segmentTextActive]}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
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

  row: { flexDirection: "row", gap: spacing.sm },
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
  textarea: { height: 100, textAlignVertical: "top", paddingTop: spacing.sm },
  charCount: { color: colors.text.secondary, fontSize: 11, textAlign: "right", marginTop: 4 },

  segment: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  segmentOption: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.dark.card,
  },
  segmentOptionActive: {
    borderColor: colors.accent.DEFAULT,
    backgroundColor: `${colors.accent.DEFAULT}22`,
  },
  segmentText: { color: colors.text.secondary, fontSize: 13, fontWeight: "600" },
  segmentTextActive: { color: colors.accent.DEFAULT },

  photosHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.dark.card,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  photosHintText: { flex: 1, color: colors.text.secondary, fontSize: 13, lineHeight: 18 },
  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photoThumb: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  thumbImage: { width: "100%", height: "100%" },
  coverBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverBadgeText: { color: "#000", fontSize: 9, fontWeight: "700" },
  removeBtn: { position: "absolute", top: 4, right: 4 },
  addPhotoBtn: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addPhotoText: { color: colors.text.secondary, fontSize: 11, fontWeight: "600" },

  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.dark.card,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  reviewLabel: { color: colors.text.secondary, fontSize: 13 },
  reviewValue: { color: colors.text.light, fontSize: 14, fontWeight: "600" },

  errorBox: {
    backgroundColor: `${colors.error}22`,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.error}44`,
  },
  errorText: { color: colors.error, fontSize: 13 },

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
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  nextBtnText: { color: "#000", fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.45 },
});
