import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { borderRadius, colors, type Palette, spacing } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import Animated, { FadeInDown } from "react-native-reanimated";

import { GuestGate } from "../../../components/GuestGate";
import { StepBar } from "../../../components/sell/StepBar";
import { logEvent } from "../../../lib/analytics";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-store";
import { ensureId } from "../../../lib/require-id";
import { useT } from "../../../lib/locale";
import { useDisplay, useTracking } from "../../../lib/typography";
import { uploadImages } from "../../../lib/upload";
import { useTheme } from "../../../lib/use-theme";

const CONDITIONS = ["excellent", "good", "fair", "poor"] as const;
type Condition = (typeof CONDITIONS)[number];

const CONDITION_LABEL_KEY: Record<
  Condition,
  "sell.condition.excellent" | "sell.condition.good" | "sell.condition.fair" | "sell.condition.poor"
> = {
  excellent: "sell.condition.excellent",
  good: "sell.condition.good",
  fair: "sell.condition.fair",
  poor: "sell.condition.poor",
};

const CATEGORIES = [
  { id: "golf-cart", labelKey: "sell.catalog.golfCart" },
  { id: "hover-board", labelKey: "sell.catalog.hoverBoard" },
  { id: "scooter", labelKey: "sell.catalog.scooter" },
  { id: "scooter-sidecar", labelKey: "sell.catalog.scooterSidecar" },
  { id: "buggy", labelKey: "sell.catalog.buggy" },
  { id: "utv", labelKey: "sell.catalog.utv" },
  { id: "jet-ski", labelKey: "sell.catalog.jetSki" },
] as const;
type CategoryId = (typeof CATEGORIES)[number]["id"];

export default function ListForRentScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const display = useDisplay();
  const track = useTracking();
  const user = useAuth((s) => s.user);
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState<CategoryId>("golf-cart");
  const [condition, setCondition] = useState<Condition>("good");
  const [dailyRate, setDailyRate] = useState("");
  const [notes, setNotes] = useState("");
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const uploaded = await uploadImages(localPhotos, "rental-listings");
      return api.submitRentalListing({
        brand: brand.trim(),
        model: model.trim(),
        year: parseInt(year, 10),
        category,
        condition,
        dailyRateEgp: dailyRate ? Number(dailyRate) : undefined,
        notes: notes.trim() || undefined,
        photos: uploaded,
      });
    },
    onSuccess: () => {
      logEvent("listing_submitted", { kind: "rent" });
      Alert.alert(t("sell.rent.submittedTitle"), t("sell.rent.submittedMessage"), [
        { text: t("sell.rent.ok"), onPress: () => router.replace("/(tabs)/sell") },
      ]);
    },
    onError: (e: unknown) => {
      Alert.alert(
        t("sell.rent.submitFailedTitle"),
        e instanceof Error ? e.message : t("sell.rent.submitFailedMessage"),
      );
    },
  });

  const pickPhotos = async (): Promise<void> => {
    if (localPhotos.length >= 6) return;
    setUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 6 - localPhotos.length,
      });
      if (!result.canceled && result.assets.length) {
        const uris = result.assets.map((a) => a.uri);
        setLocalPhotos((prev) => [...prev, ...uris].slice(0, 6));
      }
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx: number): void => {
    setLocalPhotos((p) => p.filter((_, i) => i !== idx));
  };

  const canProceed0 = brand.trim() && model.trim() && /^\d{4}$/.test(year);
  const canProceed1 = localPhotos.length >= 1;
  const blocked = submit.isPending || (step === 0 && !canProceed0) || (step === 1 && !canProceed1);

  if (!user) return <GuestGate />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => (step > 0 ? setStep(step - 1) : router.back())}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { letterSpacing: track(2) }]}>
            {t("sell.rent.eyebrow")}
          </Text>
          <Text style={[styles.title, display(0)]}>
            {step === 0
              ? t("sell.rent.titleStep0")
              : step === 1
                ? t("sell.rent.titleStep1")
                : t("sell.rent.titleStep2")}
          </Text>
        </View>
      </View>

      <StepBar step={step} total={3} palette={palette} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {step === 0 ? (
          <Animated.View entering={FadeInDown.duration(220)} style={{ gap: 14 }}>
            <Field
              label={t("sell.rent.brand")}
              value={brand}
              onChange={setBrand}
              placeholder={t("sell.rent.brandPlaceholder")}
            />
            <Field
              label={t("sell.rent.model")}
              value={model}
              onChange={setModel}
              placeholder={t("sell.rent.modelPlaceholder")}
            />
            <Field
              label={t("sell.rent.year")}
              value={year}
              onChange={(v) => setYear(v.replace(/[^0-9]/g, "").slice(0, 4))}
              placeholder={t("sell.rent.yearPlaceholder")}
              keyboardType="number-pad"
            />
            <View>
              <Label palette={palette}>{t("sell.rent.categoryLabel")}</Label>
              <View style={styles.pills}>
                {CATEGORIES.map((c) => {
                  const active = category === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setCategory(c.id)}
                      style={[styles.pill, active && styles.pillActive]}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>
                        {t(c.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View>
              <Label palette={palette}>{t("sell.rent.conditionLabel")}</Label>
              <View style={styles.pills}>
                {CONDITIONS.map((c) => {
                  const active = condition === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCondition(c)}
                      style={[styles.pill, active && styles.pillActive]}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>
                        {t(CONDITION_LABEL_KEY[c])}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Field
              label={t("sell.rent.dailyRateLabel")}
              value={dailyRate}
              onChange={(v) => setDailyRate(v.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder={t("sell.rent.dailyRatePlaceholder")}
              keyboardType="number-pad"
            />
            <View>
              <Label palette={palette}>{t("sell.rent.notesLabel")}</Label>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder={t("sell.rent.notesPlaceholder")}
                placeholderTextColor={palette.muted}
                style={[styles.input, styles.textarea]}
              />
            </View>
          </Animated.View>
        ) : null}

        {step === 1 ? (
          <Animated.View entering={FadeInDown.duration(220)} style={{ gap: 12 }}>
            <Label palette={palette}>{t("sell.rent.uploadPhotos")}</Label>
            <View style={styles.photoGrid}>
              {localPhotos.map((uri, i) => (
                <View key={i} style={styles.photoTile}>
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <Pressable onPress={() => removePhoto(i)} style={styles.photoRemove}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {localPhotos.length < 6 ? (
                <Pressable onPress={pickPhotos} style={styles.photoAdd}>
                  {uploading ? (
                    <ActivityIndicator color={colors.accent.DEFAULT} />
                  ) : (
                    <Ionicons name="camera-outline" size={26} color={palette.muted} />
                  )}
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        {step === 2 ? (
          <Animated.View entering={FadeInDown.duration(220)} style={{ gap: 14 }}>
            <View style={styles.reviewCard}>
              <Row label={t("sell.rent.reviewBrand")} value={brand} palette={palette} />
              <Row label={t("sell.rent.reviewModel")} value={model} palette={palette} />
              <Row label={t("sell.rent.reviewYear")} value={year} palette={palette} />
              <Row
                label={t("sell.rent.reviewCategory")}
                value={(() => {
                  const c = CATEGORIES.find((x) => x.id === category);
                  return c ? t(c.labelKey) : category;
                })()}
                palette={palette}
              />
              <Row
                label={t("sell.rent.reviewCondition")}
                value={t(CONDITION_LABEL_KEY[condition])}
                palette={palette}
              />
              {dailyRate ? (
                <Row
                  label={t("sell.rent.reviewDailyRate")}
                  value={`${dailyRate} ${t("sell.egp")}`}
                  palette={palette}
                />
              ) : null}
              {notes ? (
                <Row label={t("sell.rent.reviewNotes")} value={notes} palette={palette} />
              ) : null}
              <Row
                label={t("sell.rent.reviewPhotos")}
                value={`${localPhotos.length} ${t("sell.rent.photosAttachedSuffix")}`}
                palette={palette}
              />
            </View>
            <View style={styles.note}>
              <Text style={styles.noteText}>{t("sell.rent.reviewNote")}</Text>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => {
            if (step === 0) {
              if (!canProceed0) return;
              setStep(1);
            } else if (step === 1) {
              if (!canProceed1) return;
              setStep(2);
            } else {
              if (!ensureId(user, router, "/sell/list-for-rent")) return;
              submit.mutate();
            }
          }}
          disabled={blocked}
          style={[styles.submitBtn, blocked && styles.submitBtnDisabled]}
        >
          {submit.isPending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>
                {step === 2 ? t("sell.rent.submit") : t("sell.rent.continue")}
              </Text>
              <Ionicons
                name={step === 2 ? "checkmark-circle-outline" : "arrow-forward"}
                size={18}
                color="#000"
              />
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
}): JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View>
      <Label palette={palette}>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

function Label({
  children,
  palette,
}: {
  children: React.ReactNode;
  palette: Palette;
}): JSX.Element {
  const track = useTracking();
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: "600",
        color: palette.muted,
        letterSpacing: track(0.4),
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

function Row({
  label,
  value,
  palette,
  capitalize,
}: {
  label: string;
  value: string;
  palette: Palette;
  capitalize?: boolean;
}): JSX.Element {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <Text style={{ color: palette.muted, fontSize: 13, width: 100 }}>{label}</Text>
      <Text
        style={{
          color: palette.text,
          fontSize: 14,
          flex: 1,
          textTransform: capitalize ? "capitalize" : "none",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.bg },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingTop: 60,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    backBtn: { paddingTop: 4 },
    eyebrow: { fontSize: 11, fontWeight: "700", color: palette.muted },
    title: { fontSize: 28, lineHeight: 32, marginTop: 4, color: palette.text },
    body: { paddingHorizontal: spacing.lg, paddingBottom: 120, paddingTop: spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      backgroundColor: palette.card,
      color: palette.text,
    },
    textarea: { height: 90, textAlignVertical: "top", paddingTop: 12 },
    pills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
    },
    pillActive: { backgroundColor: colors.brand.poolBlue, borderColor: colors.brand.poolBlue },
    pillText: { color: palette.muted, fontWeight: "600", textTransform: "capitalize" },
    pillTextActive: { color: "#000" },
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    photoTile: {
      width: 100,
      height: 100,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: palette.card,
    },
    photoRemove: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    photoAdd: {
      width: 100,
      height: 100,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: palette.border,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.card,
    },
    reviewCard: {
      borderRadius: borderRadius.md,
      padding: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
    },
    note: {
      padding: 14,
      borderRadius: borderRadius.md,
      backgroundColor: `${colors.brand.poolBlue}1A`,
    },
    noteText: { color: palette.text, fontSize: 13, opacity: 0.8, lineHeight: 18 },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 28,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      backgroundColor: palette.bg,
    },
    submitBtn: {
      flexDirection: "row",
      gap: spacing.sm,
      backgroundColor: colors.accent.DEFAULT,
      paddingVertical: 14,
      borderRadius: borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: { color: "#000", fontWeight: "700", fontSize: 15 },
  });
}
