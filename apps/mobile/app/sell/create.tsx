import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VEHICLE_CATEGORIES, type VehicleCategory } from "@trendywheels/types";
import { borderRadius, colors, type Palette, spacing } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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

import {
  FulfillmentPicker,
  optionNeedsLocation,
  type FulfillmentValue,
} from "../../components/FulfillmentPicker";
import { GuestGate } from "../../components/GuestGate";
import { logEvent } from "../../lib/analytics";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { ensureId } from "../../lib/require-id";
import { useT } from "../../lib/locale";
import { playSound } from "../../lib/sounds";
import { uploadImages } from "../../lib/upload";
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

const STEP_KEYS = [
  "sell.create.stepBasic",
  "sell.create.stepDetails",
  "sell.create.stepPhotos",
  "sell.create.stepReview",
] as const;

const TRANSMISSIONS: Transmission[] = ["automatic", "manual"];
const FUEL_TYPES: FuelType[] = ["gasoline", "electric", "hybrid"];

const TRANSMISSION_LABEL_KEY: Record<
  Transmission,
  "sell.transmission.automatic" | "sell.transmission.manual"
> = {
  automatic: "sell.transmission.automatic",
  manual: "sell.transmission.manual",
};

const FUEL_LABEL_KEY: Record<
  FuelType,
  "sell.fuel.gasoline" | "sell.fuel.electric" | "sell.fuel.hybrid"
> = {
  gasoline: "sell.fuel.gasoline",
  electric: "sell.fuel.electric",
  hybrid: "sell.fuel.hybrid",
};

export default function SellCreateScreen(): JSX.Element {
  const { palette } = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
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
  const [fulfillment, setFulfillment] = useState<FulfillmentValue>({ type: null, location: "" });
  const onYearChange = (event: DateTimePickerEvent, selected?: Date): void => {
    if (Platform.OS !== "ios") setShowYearPicker(false);
    if (event.type === "set" && selected) set("year", String(selected.getFullYear()));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const uploadedUrls = await uploadImages(form.images, "sales");

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
        fulfillmentType: fulfillment.type,
        dropoffLocationUrl: optionNeedsLocation(fulfillment.type)
          ? fulfillment.location.trim() || null
          : null,
      };
      if (__DEV__) console.log("[sell] POST /sales", payload);
      return api.createSalesListing(payload);
    },
    onSuccess: () => {
      logEvent("listing_submitted", { kind: "sell" });
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

  // Mirror the server schema (createSalesListingSchema) so the form can't
  // reach Publish in a state the API will 400 on. title.min(5), description
  // .min(10) were the silent rejections that surfaced as a vague "validation
  // error" even though the user assumed it was the (actually-optional) photos.
  const TITLE_MIN = 5;
  const DESC_MIN = 10;

  const canProceed = (): boolean => {
    if (step === 0)
      return !!(
        form.title.trim().length >= TITLE_MIN &&
        form.make.trim() &&
        form.model.trim() &&
        form.year
      );
    if (step === 1)
      return !!(
        form.price &&
        form.mileage &&
        form.color.trim() &&
        form.description.trim().length >= DESC_MIN
      );
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

  if (!user) return <GuestGate />;

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
        <Text style={styles.headerTitle}>{t("sell.create.headerTitle")}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepBar}>
        {STEP_KEYS.map((labelKey, i) => (
          <View key={labelKey} style={styles.stepItem}>
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
            {i < STEP_KEYS.length - 1 && (
              <View style={[styles.stepLine, i < step && styles.stepLineDone]} />
            )}
          </View>
        ))}
      </View>
      <Text style={styles.stepLabel}>{t(STEP_KEYS[step])}</Text>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 0 — Basic Info */}
        {step === 0 && (
          <Animated.View entering={FadeInRight.springify()} style={{ gap: spacing.md }}>
            <Field
              label={t("sell.create.listingTitle")}
              placeholder={t("sell.create.listingTitlePlaceholder")}
              value={form.title}
              onChangeText={(v) => set("title", v)}
            />
            {form.title.length > 0 && form.title.trim().length < TITLE_MIN ? (
              <Text style={styles.inputHint}>{t("sell.create.titleHint")}</Text>
            ) : null}
            <Text style={styles.fieldLabel}>{t("sell.create.categoryLabel")}</Text>
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
                      {t(`home.categories.${c.key}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label={t("sell.create.make")}
                  placeholder={t("sell.create.makePlaceholder")}
                  value={form.make}
                  onChangeText={(v) => set("make", v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label={t("sell.create.model")}
                  placeholder={t("sell.create.modelPlaceholder")}
                  value={form.model}
                  onChangeText={(v) => set("model", v)}
                />
              </View>
            </View>
            <View>
              <Text style={styles.fieldLabel}>{t("sell.create.yearLabel")}</Text>
              <Pressable style={styles.input} onPress={() => setShowYearPicker(true)}>
                <Text
                  style={{
                    color: form.year ? palette.text : palette.muted,
                    fontSize: 15,
                  }}
                >
                  {form.year || t("sell.create.yearPlaceholder")}
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
                  label={t("sell.create.price")}
                  placeholder={t("sell.create.pricePlaceholder")}
                  value={form.price}
                  onChangeText={(v) => set("price", v)}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label={t("sell.create.mileage")}
                  placeholder={t("sell.create.mileagePlaceholder")}
                  value={form.mileage}
                  onChangeText={(v) => set("mileage", v)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <SegmentField
              label={t("sell.create.transmissionLabel")}
              options={TRANSMISSIONS}
              value={form.transmission}
              onChange={(v) => set("transmission", v as Transmission)}
              labelFor={(opt) => t(TRANSMISSION_LABEL_KEY[opt as Transmission])}
            />

            <SegmentField
              label={t("sell.create.fuelTypeLabel")}
              options={FUEL_TYPES}
              value={form.fuelType}
              onChange={(v) => set("fuelType", v as FuelType)}
              labelFor={(opt) => t(FUEL_LABEL_KEY[opt as FuelType])}
            />

            <Field
              label={t("sell.create.colorLabel")}
              placeholder={t("sell.create.colorPlaceholder")}
              value={form.color}
              onChangeText={(v) => set("color", v)}
            />

            <View>
              <Text style={styles.fieldLabel}>{t("sell.create.descriptionLabel")}</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.description}
                onChangeText={(v) => set("description", v)}
                placeholder={t("sell.create.descriptionPlaceholder")}
                placeholderTextColor={palette.muted}
                multiline
                numberOfLines={5}
                maxLength={1000}
              />
              <View style={styles.hintRow}>
                {form.description.trim().length < DESC_MIN ? (
                  <Text style={styles.inputHint}>{t("sell.create.descriptionHint")}</Text>
                ) : (
                  <View />
                )}
                <Text style={styles.charCount}>{form.description.length}/1000</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Step 2 — Photos */}
        {step === 2 && (
          <Animated.View entering={FadeInRight.springify()} style={{ gap: spacing.md }}>
            <View style={styles.photosHint}>
              <Ionicons name="images-outline" size={20} color={palette.muted} />
              <Text style={styles.photosHintText}>{t("sell.create.photosHint")}</Text>
            </View>

            <View style={styles.photosGrid}>
              {form.images.map((uri, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.thumbImage} contentFit="cover" />
                  {i === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>{t("sell.create.cover")}</Text>
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
                  <Text style={styles.addPhotoText}>{t("sell.create.addPhoto")}</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <Animated.View entering={FadeInRight.springify()} style={{ gap: spacing.md }}>
            <ReviewRow label={t("sell.create.reviewTitle")} value={form.title} />
            <ReviewRow
              label={t("sell.create.reviewMakeModel")}
              value={`${form.make} ${form.model}`}
            />
            <ReviewRow label={t("sell.create.reviewYear")} value={form.year} />
            <ReviewRow
              label={t("sell.create.reviewPrice")}
              value={`${Number(form.price).toLocaleString()} ${t("sell.egp")}`}
            />
            <ReviewRow
              label={t("sell.create.reviewMileage")}
              value={`${Number(form.mileage).toLocaleString()} km`}
            />
            <ReviewRow
              label={t("sell.create.reviewTransmission")}
              value={t(TRANSMISSION_LABEL_KEY[form.transmission])}
            />
            <ReviewRow
              label={t("sell.create.reviewFuel")}
              value={t(FUEL_LABEL_KEY[form.fuelType])}
            />
            <ReviewRow label={t("sell.create.reviewColor")} value={form.color} />
            <ReviewRow
              label={t("sell.create.reviewPhotos")}
              value={`${form.images.length} ${t("sell.create.photoCountSuffix")}`}
            />

            <FulfillmentPicker side="sell" value={fulfillment} onChange={setFulfillment} />

            {mutation.isError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {(mutation.error as Error).message || t("sell.create.createFailed")}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        {step < STEP_KEYS.length - 1 ? (
          <Pressable
            style={[styles.nextBtn, !canProceed() && styles.btnDisabled]}
            disabled={!canProceed()}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setStep(step + 1);
            }}
          >
            <Text style={styles.nextBtnText}>{t("sell.create.continue")}</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" />
          </Pressable>
        ) : (
          <Pressable
            style={[styles.nextBtn, mutation.isPending && styles.btnDisabled]}
            disabled={mutation.isPending}
            onPress={() => {
              if (!ensureId(user, router, "/sell/create")) return;
              mutation.mutate();
            }}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>{t("sell.create.publish")}</Text>
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
  labelFor,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  labelFor?: (opt: string) => string;
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
              {labelFor ? labelFor(opt) : opt.charAt(0).toUpperCase() + opt.slice(1)}
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
    hintRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    inputHint: { color: colors.warning, fontSize: 11, fontWeight: "600" },

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
