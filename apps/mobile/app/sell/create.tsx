import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VEHICLE_CATEGORIES, type VehicleCategory } from "@trendywheels/types";
import { borderRadius, colors, type Palette, spacing } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { playSound } from "../../lib/sounds";
import { useTheme } from "../../lib/use-theme";

type Transmission = "automatic" | "manual";
type FuelType = "electric" | "gasoline" | "hybrid";

interface FormData {
  title: string;
  category: VehicleCategory;
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
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    title: "",
    category: "golf-cart",
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

  const set = (key: keyof FormData, value: string | string[] | VehicleCategory): void =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Year picker — Android shows a modal, iOS renders inline. Hide after each
  // pick so the spinner doesn't stick around in scroll view.
  const [showYearPicker, setShowYearPicker] = useState(false);
  const onYearChange = (event: DateTimePickerEvent, selected?: Date): void => {
    if (Platform.OS !== "ios") setShowYearPicker(false);
    if (event.type === "set" && selected) set("year", String(selected.getFullYear()));
  };

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

      const payload = {
        title: form.title,
        category: form.category,
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
      };
      if (__DEV__) console.log("[sell] POST /sales", payload);
      return api.createSalesListing(payload);
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSound("celebrate");
      void qc.invalidateQueries({ queryKey: ["sales-listings"] });
      void qc.invalidateQueries({ queryKey: ["my-listings"] });
      router.replace("/sell/my-listings");
    },
    onError: (err) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playSound("error");
      if (__DEV__) console.log("[sell] POST /sales failed:", err);
    },
  });

  const canProceed = (): boolean => {
    if (step === 0)
      return !!(form.title.trim() && form.make.trim() && form.model.trim() && form.year);
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
    set(
      "images",
      form.images.filter((_, i) => i !== idx),
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => (step > 0 ? setStep(step - 1) : router.back())}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
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
                <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>{i + 1}</Text>
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
            <Text style={styles.fieldLabel}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {VEHICLE_CATEGORIES.map((c) => {
                const active = form.category === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => set("category", c.key)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      marginRight: 8,
                      backgroundColor: active ? colors.brand.poolBlue : palette.card,
                      borderColor: active ? colors.brand.poolBlue : palette.border,
                    }}
                  >
                    <Ionicons
                      name={c.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={active ? "#000" : palette.muted}
                    />
                    <Text
                      style={{
                        color: active ? "#000" : palette.muted,
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
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
            <View>
              <Text style={styles.fieldLabel}>Year *</Text>
              <Pressable style={styles.input} onPress={() => setShowYearPicker(true)}>
                <Text
                  style={{
                    color: form.year ? palette.text : palette.muted,
                    fontSize: 15,
                  }}
                >
                  {form.year || "Tap to pick"}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={palette.muted}
                  style={{ position: "absolute", right: 12, top: 14 }}
                />
              </Pressable>
              {showYearPicker ? (
                <DateTimePicker
                  value={form.year ? new Date(parseInt(form.year, 10), 0, 1) : new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={new Date(1970, 0, 1)}
                  maximumDate={new Date()}
                  onChange={onYearChange}
                />
              ) : null}
            </View>
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
                placeholderTextColor={palette.muted}
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
              <Ionicons name="images-outline" size={20} color={palette.muted} />
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
                  <Ionicons name="camera-outline" size={28} color={palette.muted} />
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
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={palette.muted} {...props} />
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
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
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
            <Text style={[styles.segmentText, opt === value && styles.segmentTextActive]}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }): JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
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
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      justifyContent: "center",
      alignItems: "center",
    },
    stepDone: { backgroundColor: colors.accent.DEFAULT, borderColor: colors.accent.DEFAULT },
    stepActive: { borderColor: colors.accent.DEFAULT },
    stepNum: { color: palette.muted, fontSize: 12, fontWeight: "700" },
    stepNumActive: { color: colors.accent.DEFAULT },
    stepLine: { flex: 1, height: 2, backgroundColor: palette.border, marginHorizontal: 4 },
    stepLineDone: { backgroundColor: colors.accent.DEFAULT },
    stepLabel: {
      color: palette.muted,
      fontSize: 12,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },

    row: { flexDirection: "row", gap: spacing.sm },
    fieldLabel: { color: palette.muted, fontSize: 12, marginBottom: 6, fontWeight: "600" },
    input: {
      backgroundColor: palette.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      color: palette.text,
      fontSize: 15,
    },
    textarea: { height: 100, textAlignVertical: "top", paddingTop: spacing.sm },
    charCount: { color: palette.muted, fontSize: 11, textAlign: "right", marginTop: 4 },

    segment: {
      flexDirection: "row",
      gap: spacing.sm,
      flexWrap: "wrap",
    },
    segmentOption: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      backgroundColor: palette.card,
    },
    segmentOptionActive: {
      borderColor: colors.accent.DEFAULT,
      backgroundColor: `${colors.accent.DEFAULT}22`,
    },
    segmentText: { color: palette.muted, fontSize: 13, fontWeight: "600" },
    segmentTextActive: { color: colors.accent.DEFAULT },

    photosHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: palette.card,
      borderRadius: 10,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
    },
    photosHintText: { flex: 1, color: palette.muted, fontSize: 13, lineHeight: 18 },
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
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      borderStyle: "dashed",
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
    },
    addPhotoText: { color: palette.muted, fontSize: 11, fontWeight: "600" },

    reviewRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: palette.card,
      borderRadius: 10,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
    },
    reviewLabel: { color: palette.muted, fontSize: 13 },
    reviewValue: { color: palette.text, fontSize: 14, fontWeight: "600" },

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
      backgroundColor: palette.bg,
      borderTopWidth: 1,
      borderTopColor: palette.border,
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
}
