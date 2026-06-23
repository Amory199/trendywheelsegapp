import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "@tanstack/react-query";
import { rentalDays } from "@trendywheels/types";
import { colors, type Palette, spacing, typography } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import {
  FulfillmentPicker,
  optionNeedsLocation,
  type FulfillmentValue,
} from "../../components/FulfillmentPicker";
import { GuestGate } from "../../components/GuestGate";
import { TWSkiaConfetti } from "../../components/skia/confetti";
import { logEvent } from "../../lib/analytics";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useHumanizeError } from "../../lib/humanize-error";
import { useT } from "../../lib/locale";
import { playSound } from "../../lib/sounds";
import { useTheme } from "../../lib/use-theme";

const STEP_KEYS = ["rent.stepDates", "rent.stepYourInfo", "rent.stepPayment"] as const;

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
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [licenseNum, setLicenseNum] = useState("");
  const [fulfillment, setFulfillment] = useState<FulfillmentValue>({ type: null, location: "" });
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [booked, setBooked] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const { data: vehicleData } = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => api.getVehicle(vehicleId!),
    enabled: !!vehicleId,
  });

  const vehicle = vehicleData?.data;

  // Shared billable-days rule (@trendywheels/types) so the estimate shown here
  // matches what the API charges. 0 until both dates are picked.
  const days = startDate && endDate ? rentalDays(startDate, endDate) : 0;

  const totalCost = days * Number(vehicle?.dailyRate ?? 0);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        vehicleId: vehicleId!,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        dropoffLocationUrl: optionNeedsLocation(fulfillment.type)
          ? fulfillment.location.trim() || null
          : null,
        fulfillmentType: fulfillment.type,
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
    return <SuccessScreen bookingRef={bookingRef} email={email} router={router} />;
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
              <DateField label={t("rent.pickupDate")} value={startDate} onChange={setStartDate} />
              <DateField
                label={t("rent.returnDate")}
                value={endDate}
                onChange={setEndDate}
                minimumDate={startDate ? new Date(startDate) : undefined}
              />
              {days > 0 && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryText}>
                    {days} {days !== 1 ? t("rent.dayMany") : t("rent.dayOne")} ·{" "}
                    <Text style={styles.summaryPrice}>
                      {totalCost.toLocaleString()} {t("rent.currency")}{" "}
                      {t("rent.summaryTotalSuffix")}
                    </Text>
                  </Text>
                </View>
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
              <LabeledInput
                label={t("rent.driversLicense")}
                value={licenseNum}
                onChangeText={setLicenseNum}
                placeholder={t("rent.licensePlaceholder")}
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
              <PaymentOption
                label={t("rent.creditDebitCard")}
                icon="card-outline"
                selected={paymentMethod === "card"}
                onPress={() => setPaymentMethod("card")}
              />
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>{t("rent.total")}</Text>
                <Text style={styles.totalValue}>
                  {totalCost.toLocaleString()} {t("rent.currency")}
                </Text>
                <Text style={styles.totalDays}>
                  {days} {days !== 1 ? t("rent.dayMany") : t("rent.dayOne")} @{" "}
                  {Number(vehicle?.dailyRate).toLocaleString()} {t("rent.currency")}
                  {t("rent.perDayPaymentSuffix")}
                </Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step < 2 ? (
            <Pressable
              style={[
                styles.nextBtn,
                !canProceed(step, { startDate, endDate, name, email, phone, licenseNum }) &&
                  styles.btnDisabled,
              ]}
              disabled={!canProceed(step, { startDate, endDate, name, email, phone, licenseNum })}
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
              style={[styles.confirmBtn, mutation.isPending && styles.btnDisabled]}
              disabled={mutation.isPending}
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

function canProceed(
  step: number,
  fields: {
    startDate: string;
    endDate: string;
    name: string;
    email: string;
    phone: string;
    licenseNum: string;
  },
): boolean {
  if (step === 0)
    return (
      !!fields.startDate &&
      !!fields.endDate &&
      new Date(fields.endDate) > new Date(fields.startDate)
    );
  if (step === 1) return !!fields.name && !!fields.email && !!fields.phone && !!fields.licenseNum;
  return true;
}

function DateField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
  minimumDate?: Date;
}): JSX.Element {
  const { palette } = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [show, setShow] = useState(false);
  const dateValue = value ? new Date(value) : new Date();
  const formatted = value
    ? dateValue.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : t("rent.tapToChoose");

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={[styles.input, { justifyContent: "center" }]} onPress={() => setShow(true)}>
        <Text style={{ color: value ? palette.text : palette.muted, fontSize: 15 }}>
          {formatted}
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={minimumDate ?? new Date()}
          onChange={(_, picked) => {
            if (Platform.OS !== "ios") setShow(false);
            if (picked) {
              const iso = picked.toISOString().slice(0, 10);
              onChange(iso);
            }
          }}
        />
      )}
      {show && Platform.OS === "ios" && (
        <Pressable onPress={() => setShow(false)} style={styles.pickerDoneBtn}>
          <Text style={styles.pickerDoneBtnText}>{t("rent.done")}</Text>
        </Pressable>
      )}
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
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  selected: boolean;
  onPress: () => void;
}): JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <Pressable
      style={[styles.paymentOption, selected && styles.paymentOptionSelected]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color={selected ? colors.accent.DEFAULT : palette.muted} />
      <Text style={[styles.paymentLabel, selected && styles.paymentLabelSelected]}>{label}</Text>
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
    inputGroup: { gap: 6 },
    inputLabel: { color: palette.muted, fontSize: 13 },
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
}: {
  bookingRef: string;
  email: string;
  router: ReturnType<typeof useRouter>;
}): JSX.Element {
  const { palette } = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const checkScale = useSharedValue(0);
  const refPulse = useSharedValue(1);

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
        <Animated.View style={refAnim}>
          <Text style={styles.successRef}>
            {t("rent.refPrefix")} {bookingRef}
          </Text>
        </Animated.View>
        <Text style={styles.successMsg}>
          {t("rent.successMessagePrefix")} {email || t("rent.successMessageFallbackInbox")}
          {t("rent.successMessageSuffix")}
        </Text>
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
