import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "@tanstack/react-query";
import { rentalDays, rentalQuote } from "@trendywheels/types";
import { colors, type Palette, spacing, typography } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInRight,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import QRCode from "react-native-qrcode-svg";

import {
  FulfillmentPicker,
  optionNeedsLocation,
  type FulfillmentValue,
} from "../../components/FulfillmentPicker";
import { GuestGate } from "../../components/GuestGate";
import { RentCalendar } from "../../components/RentCalendar";
import { TWSkiaConfetti } from "../../components/skia/confetti";
import { openContextChat } from "../../lib/context-chat";
import { logEvent } from "../../lib/analytics";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useHumanizeError } from "../../lib/humanize-error";
import { useT } from "../../lib/locale";
import { playSound } from "../../lib/sounds";
import { useTheme } from "../../lib/use-theme";

const STEP_KEYS = [
  "rent.stepDates",
  "rent.stepYourInfo",
  "rent.stepPayment",
  "rent.stepVerify",
] as const;

// Driver's-licence number bounds — MUST match the server (updateUserSchema:
// z.string().min(3).max(40)) so the app never lets through a value the API 400s.
const LICENSE_MIN = 3;
const LICENSE_MAX = 40;

type IdImg = { uri: string | null; mime: string };

/** Upload a locally-picked image to storage and return its absolute URL. A URL
 *  that's already remote (already on the profile) is passed through untouched,
 *  and a missing image yields null. Absolute URLs keep updateUserSchema's
 *  z.string().url() checks happy — a relative URL was a prime "invalid form" cause. */
async function uploadIfLocal(img: IdImg, prefix: string): Promise<string | null> {
  if (!img.uri) return null;
  if (!img.uri.startsWith("file:")) return img.uri;
  const { uploadUrl, fileUrl } = await api.getUploadUrl(img.mime, prefix);
  const blob = await fetch(img.uri).then((r) => r.blob());
  await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": img.mime } });
  return fileUrl;
}

function StepIndicator({ current }: { current: number }): JSX.Element {
  const { palette } = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.steps}>
      {STEP_KEYS.map((labelKey, i) => (
        <View key={labelKey} style={styles.stepItem}>
          <View style={[styles.stepCircle, i <= current && styles.stepCircleActive]}>
            {i < current ? (
              <Ionicons name="checkmark" size={14} color="#000" />
            ) : (
              <Text style={[styles.stepNum, i === current && styles.stepNumActive]}>{i + 1}</Text>
            )}
          </View>
          <Text style={[styles.stepLabel, i === current && styles.stepLabelActive]}>
            {t(labelKey)}
          </Text>
          {i < STEP_KEYS.length - 1 && (
            <View style={[styles.stepLine, i < current && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function BookScreen(): JSX.Element {
  const { palette } = useTheme();
  const t = useT();
  const humanize = useHumanizeError();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(0);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [fulfillment, setFulfillment] = useState<FulfillmentValue>({ type: null, location: "" });
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [booked, setBooked] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  // Identity (last step) — pre-filled from the profile so returning customers
  // just tap through; persisted back to the profile on Confirm.
  const [idFront, setIdFront] = useState<IdImg>({
    uri: user?.idFrontUrl ?? null,
    mime: "image/jpeg",
  });
  const [idBack, setIdBack] = useState<IdImg>({ uri: user?.idBackUrl ?? null, mime: "image/jpeg" });
  const [licenseNum, setLicenseNum] = useState(user?.licenseNumber ?? "");
  const [licenseExpiry, setLicenseExpiry] = useState(user?.licenseExpiry ?? "");
  const [licensePhoto, setLicensePhoto] = useState<IdImg>({
    uri: user?.licensePhotoUrl ?? null,
    mime: "image/jpeg",
  });
  const [showExpiry, setShowExpiry] = useState(false);

  const { data: vehicleData } = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => api.getVehicle(vehicleId!),
    enabled: !!vehicleId,
  });

  const vehicle = vehicleData?.data;

  // Availability for the calendar: weekday pattern + admin blackout dates +
  // fully-booked dates. Falls back to the vehicle DTO's own fields while loading.
  const { data: availData } = useQuery({
    queryKey: ["availability", vehicleId],
    queryFn: () => api.getVehicleAvailability(vehicleId!),
    enabled: !!vehicleId,
  });
  const avail = availData?.data;
  const availableDays = avail?.availableDays ?? vehicle?.availableDays ?? [];
  const blockedDates = avail?.blockedDates ?? [];
  const bookedDates = avail?.bookedDates ?? [];

  // Shared billable-days rule (@trendywheels/types) so the estimate shown here
  // matches what the API charges. 0 until both dates are picked.
  const days = startDate && endDate ? rentalDays(startDate, endDate) : 0;

  // Cheapest daily/weekly/monthly mix — same engine the server charges with.
  const totalCost =
    days > 0 && vehicle?.dailyRate != null
      ? rentalQuote(days, {
          daily: Number(vehicle.dailyRate),
          weekly: vehicle.weeklyRate != null ? Number(vehicle.weeklyRate) : null,
          monthly: vehicle.monthlyRate != null ? Number(vehicle.monthlyRate) : null,
        }).total
      : 0;

  // Inline licence validation — bounds match the server (LICENSE_MIN/MAX).
  const licenseTrimmed = licenseNum.trim();
  const licenseError =
    licenseTrimmed.length === 0
      ? null
      : licenseTrimmed.length < LICENSE_MIN
        ? t("rent.licenseTooShort")
        : licenseTrimmed.length > LICENSE_MAX
          ? t("rent.licenseTooLong")
          : null;
  const licenseValid = licenseTrimmed.length >= LICENSE_MIN && licenseTrimmed.length <= LICENSE_MAX;
  const identityComplete = !!idFront.uri && !!idBack.uri && licenseValid && !!licenseExpiry;

  // Step-advance gate (steps 0–2; step 3 uses the Confirm button + identityComplete).
  // The calendar only ever yields a contiguous available range, so start+end is
  // sufficient here — no separate weekday re-check needed.
  const canGoNext =
    step === 0
      ? !!startDate && !!endDate && endDate > startDate
      : step === 1
        ? !!name && !!email && !!phone
        : true;

  const pickImage = async (set: (s: IdImg) => void): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      set({ uri: result.assets[0].uri, mime: result.assets[0].mimeType ?? "image/jpeg" });
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // 1. Persist identity to the profile first (upload any newly-picked images).
      //    Sends a strict ISO expiry + absolute photo URLs so the server never
      //    400s the licence the way the old up-front form could ("invalid form").
      if (user) {
        const [idFrontUrl, idBackUrl, licensePhotoUrl] = await Promise.all([
          uploadIfLocal(idFront, "id-documents"),
          uploadIfLocal(idBack, "id-documents"),
          uploadIfLocal(licensePhoto, "licenses"),
        ]);
        const updated = await api.updateUser(user.id, {
          idFrontUrl,
          idBackUrl,
          licenseNumber: licenseTrimmed,
          licenseExpiry: licenseExpiry ? new Date(licenseExpiry).toISOString() : null,
          licensePhotoUrl: licensePhotoUrl ?? null,
        });
        setUser(updated.data);
      }
      // 2. Create the booking.
      const payload = {
        vehicleId: vehicleId!,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        dropoffLocationUrl: optionNeedsLocation(fulfillment.type)
          ? fulfillment.location.trim() || null
          : null,
        fulfillmentType: fulfillment.type,
        paymentMethod: "cash" as const,
      };
      if (__DEV__) console.log("[book] POST /bookings", payload);
      return api.createBooking(payload);
    },
    onSuccess: (res) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSound("celebrate");
      logEvent("booking_created", { vehicle_id: vehicleId, total_egp: totalCost, days });
      setBookingRef(res.data?.id ?? "");
      setBooked(true);
    },
    onError: (err) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playSound("error");
      if (__DEV__) console.log("[book] POST /bookings failed:", err);
      Alert.alert(t("rent.bookingFailedTitle"), humanize(err));
    },
  });

  if (!user) return <GuestGate />;

  if (booked) {
    return (
      <SuccessScreen
        bookingRef={bookingRef}
        email={email}
        router={router}
        vehicleName={vehicle?.name ?? ""}
        startDate={startDate}
        endDate={endDate}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => (step > 0 ? setStep((s) => s - 1) : router.back())}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{vehicle?.name ?? t("rent.bookVehicle")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <StepIndicator current={step} />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <Animated.View entering={FadeInRight.springify()} style={styles.stepContent}>
              <Text style={styles.stepHeading}>{t("rent.selectDates")}</Text>
              <RentCalendar
                availableDays={availableDays}
                blockedDates={blockedDates}
                bookedDates={bookedDates}
                startDate={startDate}
                endDate={endDate}
                onSelect={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
              {days > 0 ? (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryText}>
                    {days} {days !== 1 ? t("rent.dayMany") : t("rent.dayOne")} ·{" "}
                    <Text style={styles.summaryPrice}>
                      {totalCost.toLocaleString()} {t("rent.currency")}{" "}
                      {t("rent.summaryTotalSuffix")}
                    </Text>
                  </Text>
                </View>
              ) : (
                <Text style={styles.pickHint}>{t("rent.pickDatesHint")}</Text>
              )}
            </Animated.View>
          )}

          {step === 1 && (
            <Animated.View entering={FadeInRight.springify()} style={styles.stepContent}>
              <Text style={styles.stepHeading}>{t("rent.yourInformation")}</Text>
              <LabeledInput
                label={t("rent.fullName")}
                value={name}
                onChangeText={setName}
                placeholder={t("rent.fullNamePlaceholder")}
              />
              <LabeledInput
                label={t("rent.email")}
                value={email}
                onChangeText={setEmail}
                placeholder={t("rent.emailPlaceholder")}
                keyboardType="email-address"
              />
              <LabeledInput
                label={t("rent.phone")}
                value={phone}
                onChangeText={setPhone}
                placeholder={t("rent.phonePlaceholder")}
                keyboardType="phone-pad"
              />
              <FulfillmentPicker side="buy" value={fulfillment} onChange={setFulfillment} />
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeInRight.springify()} style={styles.stepContent}>
              <Text style={styles.stepHeading}>{t("rent.paymentMethod")}</Text>
              <PaymentOption
                label={t("rent.cashOnPickup")}
                icon="cash-outline"
                selected={paymentMethod === "cash"}
                onPress={() => setPaymentMethod("cash")}
              />
              {/* Card is not wired to a gateway yet — show it honestly as
                  coming soon instead of a selectable option that does nothing. */}
              <PaymentOption
                label={t("rent.creditDebitCard")}
                icon="card-outline"
                selected={false}
                disabled
                badge={t("rent.comingSoon")}
                onPress={() => {}}
              />
              <View style={styles.totalCard}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    {days} {days !== 1 ? t("rent.dayMany") : t("rent.dayOne")}
                  </Text>
                  <Text style={styles.breakdownValue}>
                    {totalCost.toLocaleString()} {t("rent.currency")}
                  </Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownRow}>
                  <Text style={styles.totalLabel}>{t("rent.total")}</Text>
                  <Text style={styles.totalValue}>
                    {totalCost.toLocaleString()} {t("rent.currency")}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {step === 3 && (
            <Animated.View entering={FadeInRight.springify()} style={styles.stepContent}>
              <Text style={styles.stepHeading}>{t("rent.verifyIdentity")}</Text>
              <Text style={styles.verifySub}>{t("rent.verifyIdentitySub")}</Text>

              <View style={styles.idRow}>
                <IdPhoto
                  label={t("rent.idFront")}
                  img={idFront}
                  onPress={() => pickImage(setIdFront)}
                />
                <IdPhoto
                  label={t("rent.idBack")}
                  img={idBack}
                  onPress={() => pickImage(setIdBack)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("rent.licenseNumberLabel")}</Text>
                <TextInput
                  style={[styles.input, !!licenseError && styles.inputError]}
                  value={licenseNum}
                  onChangeText={setLicenseNum}
                  placeholder={t("rent.licensePlaceholder")}
                  placeholderTextColor={palette.muted}
                  autoCapitalize="characters"
                />
                {licenseError ? <Text style={styles.fieldError}>{licenseError}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("rent.licenseExpiryLabel")}</Text>
                <Pressable
                  style={[styles.input, { justifyContent: "center" }]}
                  onPress={() => setShowExpiry(true)}
                >
                  <Text
                    style={{ color: licenseExpiry ? palette.text : palette.muted, fontSize: 15 }}
                  >
                    {licenseExpiry
                      ? new Date(licenseExpiry).toLocaleDateString()
                      : t("rent.pickDate")}
                  </Text>
                </Pressable>
                {showExpiry && (
                  <DateTimePicker
                    value={licenseExpiry ? new Date(licenseExpiry) : new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={new Date()}
                    onChange={(e, picked) => {
                      if (Platform.OS !== "ios") setShowExpiry(false);
                      if (e.type === "set" && picked) setLicenseExpiry(picked.toISOString());
                    }}
                  />
                )}
                {showExpiry && Platform.OS === "ios" && (
                  <Pressable onPress={() => setShowExpiry(false)} style={styles.pickerDoneBtn}>
                    <Text style={styles.pickerDoneBtnText}>{t("rent.done")}</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("rent.licensePhotoLabel")}</Text>
                <Pressable
                  onPress={() => pickImage(setLicensePhoto)}
                  style={styles.licensePhotoBtn}
                >
                  {licensePhoto.uri ? (
                    <Image
                      source={{ uri: licensePhoto.uri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.photoEmpty}>
                      <Ionicons name="camera-outline" size={26} color={palette.muted} />
                      <Text style={styles.photoEmptyText}>{t("rent.tapToUpload")}</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step < 3 ? (
            <Pressable
              style={[styles.nextBtn, !canGoNext && styles.btnDisabled]}
              disabled={!canGoNext}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStep((s) => s + 1);
              }}
            >
              <Text style={styles.nextBtnText}>{t("rent.continue")}</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.confirmBtn,
                (mutation.isPending || !vehicle || !identityComplete) && styles.btnDisabled,
              ]}
              // Block confirm until the vehicle (and thus the real price) has
              // loaded — otherwise a slow/failed fetch lets a booking submit
              // against a "NaN / 0 EGP" breakdown — and until identity is complete.
              disabled={mutation.isPending || !vehicle || !identityComplete}
              onPress={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.confirmBtnText}>{t("rent.confirmBooking")}</Text>
              )}
            </Pressable>
          )}
          {mutation.isError && (
            <Text style={styles.errorText}>{t("rent.bookingFailedInline")}</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// One side of the national-ID capture (front / back). Shows the picked/stored
// image or a dashed upload placeholder.
function IdPhoto({
  label,
  img,
  onPress,
}: {
  label: string;
  img: IdImg;
  onPress: () => void;
}): JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable onPress={onPress} style={styles.idPhotoBtn}>
        {img.uri ? (
          <Image source={{ uri: img.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={styles.photoEmpty}>
            <Ionicons name="camera-outline" size={24} color={palette.muted} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
}): JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="none"
      />
    </View>
  );
}

function PaymentOption({
  label,
  icon,
  selected,
  onPress,
  disabled,
  badge,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
}): JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <Pressable
      style={[
        styles.paymentOption,
        selected && styles.paymentOptionSelected,
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={24} color={selected ? colors.accent.DEFAULT : palette.muted} />
      <Text style={[styles.paymentLabel, selected && styles.paymentLabelSelected]}>{label}</Text>
      {badge ? (
        <View style={styles.paymentBadge}>
          <Text style={styles.paymentBadgeText}>{badge}</Text>
        </View>
      ) : null}
      {selected && <Ionicons name="checkmark-circle" size={20} color={colors.accent.DEFAULT} />}
    </Pressable>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.bg },
    kav: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    headerTitle: { color: palette.text, fontSize: 16, fontWeight: "700" },
    steps: {
      flexDirection: "row",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      gap: 0,
    },
    stepItem: { flexDirection: "row", alignItems: "center", flex: 1 },
    stepCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: palette.card,
      borderWidth: 2,
      borderColor: palette.border,
      justifyContent: "center",
      alignItems: "center",
    },
    stepCircleActive: {
      backgroundColor: colors.accent.DEFAULT,
      borderColor: colors.accent.DEFAULT,
    },
    stepNum: { color: palette.muted, fontSize: 12, fontWeight: "700" },
    stepNumActive: { color: "#000" },
    stepLabel: { color: palette.muted, fontSize: 11, marginLeft: 4 },
    stepLabelActive: { color: palette.text },
    stepLine: { flex: 1, height: 2, backgroundColor: palette.border, marginHorizontal: 4 },
    stepLineActive: { backgroundColor: colors.accent.DEFAULT },
    body: { padding: spacing.lg, paddingBottom: 120 },
    stepContent: { gap: spacing.md },
    stepHeading: {
      color: palette.text,
      fontSize: typography.fontSize.h2,
      fontWeight: typography.fontWeight.bold,
      marginBottom: spacing.sm,
    },
    summaryCard: {
      backgroundColor: `${colors.primary[700]}22`,
      borderRadius: 10,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: `${colors.primary[700]}44`,
    },
    summaryText: { color: palette.text, fontSize: 14 },
    summaryPrice: { color: colors.accent.DEFAULT, fontWeight: "700" },
    pickHint: { color: palette.muted, fontSize: 13, textAlign: "center", marginTop: 4 },
    inputGroup: { gap: 6 },
    inputLabel: { color: palette.muted, fontSize: 13 },
    verifySub: { color: palette.muted, fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
    idRow: { flexDirection: "row", gap: spacing.md },
    idPhotoBtn: {
      height: 120,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      borderStyle: "dashed",
    },
    licensePhotoBtn: {
      height: 150,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      borderStyle: "dashed",
    },
    photoEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
    photoEmptyText: { color: palette.muted, fontSize: 12 },
    inputError: { borderColor: colors.error },
    fieldError: { color: colors.error, fontSize: 12, marginTop: 2 },
    availNote: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: `${colors.brand.friendlyBlue}18`,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    availNoteText: { color: palette.text, fontSize: 13, flex: 1 },
    availNoteDays: { color: colors.brand.friendlyBlue, fontWeight: "700" },
    blockedText: {
      color: colors.error,
      fontSize: 13,
      fontWeight: "600",
      backgroundColor: `${colors.error}14`,
      borderRadius: 10,
      padding: 12,
    },
    pickerDoneBtn: {
      alignSelf: "flex-end",
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      backgroundColor: colors.accent.DEFAULT,
      borderRadius: 8,
    },
    pickerDoneBtnText: { color: "#000", fontSize: 13, fontWeight: "700" },
    input: {
      backgroundColor: palette.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      height: 48,
      paddingHorizontal: spacing.md,
      color: palette.text,
      fontSize: 15,
    },
    paymentOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: palette.card,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: 2,
      borderColor: palette.border,
    },
    paymentOptionSelected: { borderColor: colors.accent.DEFAULT },
    paymentLabel: { flex: 1, color: palette.muted, fontSize: 15 },
    paymentLabelSelected: { color: palette.text, fontWeight: "600" },
    totalCard: {
      backgroundColor: palette.card,
      borderRadius: 12,
      padding: spacing.lg,
      marginTop: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 4,
    },
    totalLabel: { color: palette.muted, fontSize: 13 },
    totalValue: { color: palette.text, fontSize: 28, fontWeight: "700" },
    totalDays: { color: palette.muted, fontSize: 13 },
    breakdownRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    breakdownLabel: { color: palette.muted, fontSize: 14 },
    breakdownValue: { color: palette.text, fontSize: 14, fontWeight: "600" },
    breakdownDivider: {
      height: 1,
      backgroundColor: palette.border,
      marginVertical: spacing.sm,
    },
    paymentBadge: {
      backgroundColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    paymentBadgeText: { color: palette.muted, fontSize: 10, fontWeight: "800" },
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.lg,
      backgroundColor: palette.bg,
      borderTopWidth: 1,
      borderTopColor: palette.border,
    },
    nextBtn: {
      flexDirection: "row",
      backgroundColor: colors.accent.DEFAULT,
      borderRadius: 12,
      height: 52,
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.sm,
    },
    nextBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
    confirmBtn: {
      backgroundColor: colors.accent.DEFAULT,
      borderRadius: 12,
      height: 52,
      justifyContent: "center",
      alignItems: "center",
    },
    confirmBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
    btnDisabled: { opacity: 0.4 },
    errorText: { color: colors.error, textAlign: "center", marginTop: spacing.sm, fontSize: 13 },
    successContainer: {
      flex: 1,
      backgroundColor: palette.bg,
      justifyContent: "center",
      padding: spacing.xl,
    },
    successCard: {
      backgroundColor: palette.card,
      borderRadius: 20,
      padding: spacing.xl,
      alignItems: "center",
      gap: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
    },
    successIcon: { marginBottom: spacing.sm },
    successTitle: { color: palette.text, fontSize: 24, fontWeight: "700" },
    successRef: { color: colors.accent.DEFAULT, fontSize: 16, fontWeight: "600" },
    successMsg: { color: palette.muted, textAlign: "center", lineHeight: 22 },
    qrWrap: {
      padding: spacing.md,
      backgroundColor: "#fff",
      borderRadius: 16,
      marginTop: spacing.sm,
    },
    successShowHint: { color: palette.muted, fontSize: 12 },
    successActionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
    successActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    successActionText: { color: palette.text, fontSize: 13, fontWeight: "600" },
    doneBtn: {
      backgroundColor: colors.accent.DEFAULT,
      borderRadius: 12,
      height: 50,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
      marginTop: spacing.sm,
    },
    doneBtnText: { color: "#000", fontWeight: "700" },
    myBookingsBtn: {
      borderRadius: 12,
      height: 50,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.border,
    },
    myBookingsBtnText: { color: palette.text, fontWeight: "600" },
  });
}

// ─── Success screen with confetti + animated checkmark ────────────

function SuccessScreen({
  bookingRef,
  email,
  router,
  vehicleName,
  startDate,
  endDate,
}: {
  bookingRef: string;
  email: string;
  router: ReturnType<typeof useRouter>;
  vehicleName: string;
  startDate: string;
  endDate: string;
}): JSX.Element {
  const { palette } = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const checkScale = useSharedValue(0);
  const refPulse = useSharedValue(1);
  // Short human code shown under the QR ("TW-829301" style) — the QR itself
  // carries the full booking id so staff can look it up exactly.
  const shortCode = `TW-${bookingRef.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

  const addToCalendar = (): void => {
    // Google Calendar template link — works on iOS + Android without a native
    // calendar module (OTA-safe). All-day range; end date is exclusive.
    const fmt = (d: string): string => d.replace(/-/g, "");
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    const url =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent(`TrendyWheels · ${vehicleName}`)}` +
      `&dates=${fmt(startDate)}/${fmt(end.toISOString().slice(0, 10))}` +
      `&details=${encodeURIComponent(`${t("rent.refPrefix")} ${shortCode}`)}`;
    void Linking.openURL(url);
  };

  useEffect(() => {
    checkScale.value = withDelay(120, withSpring(1, { damping: 8, stiffness: 120 }));
    refPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [checkScale, refPulse]);

  const checkAnim = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));
  const refAnim = useAnimatedStyle(() => ({ transform: [{ scale: refPulse.value }] }));

  return (
    <View style={styles.successContainer}>
      <TWSkiaConfetti count={80} />
      <Animated.View entering={FadeInRight.springify()} style={styles.successCard}>
        <Animated.View style={[styles.successIcon, checkAnim]}>
          <Ionicons name="checkmark-circle" size={88} color={colors.success} />
        </Animated.View>
        <Text style={styles.successTitle}>{t("rent.bookingConfirmed")}</Text>
        {/* Pickup pass: QR carries the full booking id for staff lookup. */}
        {bookingRef ? (
          <View style={styles.qrWrap}>
            <QRCode value={bookingRef} size={148} backgroundColor="transparent" />
          </View>
        ) : null}
        <Animated.View style={refAnim}>
          <Text style={styles.successRef}>
            {shortCode} · {new Date(startDate).toLocaleDateString()}
          </Text>
        </Animated.View>
        <Text style={styles.successShowHint}>{t("rent.showAtPickup")}</Text>
        <Text style={styles.successMsg}>
          {t("rent.successMessagePrefix")} {email || t("rent.successMessageFallbackInbox")}
          {t("rent.successMessageSuffix")}
        </Text>
        <View style={styles.successActionsRow}>
          <Pressable style={styles.successActionBtn} onPress={addToCalendar}>
            <Ionicons name="calendar-outline" size={16} color={palette.text} />
            <Text style={styles.successActionText}>{t("rent.addToCalendar")}</Text>
          </Pressable>
          <Pressable
            style={styles.successActionBtn}
            onPress={() =>
              void openContextChat(router, {
                contextType: "booking",
                contextId: bookingRef,
                contextTitle: `${vehicleName} · ${shortCode}`,
              })
            }
          >
            <Ionicons name="chatbubble-outline" size={16} color={palette.text} />
            <Text style={styles.successActionText}>{t("rent.messageUs")}</Text>
          </Pressable>
        </View>
        {/* Both buttons route explicitly — fall-through to /(tabs)/ would land
            an admin/sales user on their dashboard since they don't have a Rent
            tab in their nav. /rent/my-bookings works for every authenticated
            account. */}
        <Pressable style={styles.doneBtn} onPress={() => router.replace("/rent/my-bookings")}>
          <Text style={styles.doneBtnText}>{t("rent.viewMyBookings")}</Text>
        </Pressable>
        <Pressable style={styles.myBookingsBtn} onPress={() => router.replace("/(tabs)/rent")}>
          <Text style={styles.myBookingsBtnText}>{t("rent.backToBrowse")}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
