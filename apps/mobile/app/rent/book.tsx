import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "@tanstack/react-query";
import { colors, type Palette, spacing, typography } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { TWSkiaConfetti } from "../../components/skia/confetti";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { playSound } from "../../lib/sounds";
import { useTheme } from "../../lib/use-theme";

const STEPS = ["Dates", "Your Info", "Payment"];

function StepIndicator({ current }: { current: number }): JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.steps}>
      {STEPS.map((label, i) => (
        <View key={label} style={styles.stepItem}>
          <View style={[styles.stepCircle, i <= current && styles.stepCircleActive]}>
            {i < current ? (
              <Ionicons name="checkmark" size={14} color="#000" />
            ) : (
              <Text style={[styles.stepNum, i === current && styles.stepNumActive]}>{i + 1}</Text>
            )}
          </View>
          <Text style={[styles.stepLabel, i === current && styles.stepLabelActive]}>{label}</Text>
          {i < STEPS.length - 1 && (
            <View style={[styles.stepLine, i < current && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function BookScreen(): JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [booked, setBooked] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const { data: vehicleData } = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => api.getVehicle(vehicleId!),
    enabled: !!vehicleId,
  });

  const vehicle = vehicleData?.data;

  const days =
    startDate && endDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

  const totalCost = days * Number(vehicle?.dailyRate ?? 0);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        vehicleId: vehicleId!,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      };
      if (__DEV__) console.log("[book] POST /bookings", payload);
      return api.createBooking(payload);
    },
    onSuccess: (res) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSound("celebrate");
      setBookingRef(res.data?.id ?? "");
      setBooked(true);
    },
    onError: (err) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playSound("error");
      if (__DEV__) console.log("[book] POST /bookings failed:", err);
      Alert.alert(
        "Booking failed",
        err instanceof Error
          ? err.message
          : "We couldn't complete your booking. Check your details and try again.",
      );
    },
  });

  if (booked) {
    return <SuccessScreen bookingRef={bookingRef} email={email} router={router} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => (step > 0 ? setStep((s) => s - 1) : router.back())}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{vehicle?.name ?? "Book Vehicle"}</Text>
        <View style={{ width: 24 }} />
      </View>

      <StepIndicator current={step} />

      <ScrollView contentContainerStyle={styles.body}>
        {step === 0 && (
          <Animated.View entering={FadeInRight.springify()} style={styles.stepContent}>
            <Text style={styles.stepHeading}>Select Dates</Text>
            <DateField label="Pickup Date" value={startDate} onChange={setStartDate} />
            <DateField
              label="Return Date"
              value={endDate}
              onChange={setEndDate}
              minimumDate={startDate ? new Date(startDate) : undefined}
            />
            {days > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>
                  {days} day{days !== 1 ? "s" : ""} ·{" "}
                  <Text style={styles.summaryPrice}>{totalCost.toLocaleString()} EGP total</Text>
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View entering={FadeInRight.springify()} style={styles.stepContent}>
            <Text style={styles.stepHeading}>Your Information</Text>
            <LabeledInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Ahmed Mohamed"
            />
            <LabeledInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
            />
            <LabeledInput
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="+20 1xx xxx xxxx"
              keyboardType="phone-pad"
            />
            <LabeledInput
              label="Driver's License #"
              value={licenseNum}
              onChangeText={setLicenseNum}
              placeholder="License number"
            />
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeInRight.springify()} style={styles.stepContent}>
            <Text style={styles.stepHeading}>Payment Method</Text>
            <PaymentOption
              label="Cash on Pickup"
              icon="cash-outline"
              selected={paymentMethod === "cash"}
              onPress={() => setPaymentMethod("cash")}
            />
            <PaymentOption
              label="Credit / Debit Card"
              icon="card-outline"
              selected={paymentMethod === "card"}
              onPress={() => setPaymentMethod("card")}
            />
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{totalCost.toLocaleString()} EGP</Text>
              <Text style={styles.totalDays}>
                {days} day{days !== 1 ? "s" : ""} @ {Number(vehicle?.dailyRate).toLocaleString()}{" "}
                EGP/day
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
            <Text style={styles.nextBtnText}>Continue</Text>
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
              <Text style={styles.confirmBtnText}>Confirm Booking</Text>
            )}
          </Pressable>
        )}
        {mutation.isError && (
          <Text style={styles.errorText}>Booking failed. Please try again.</Text>
        )}
      </View>
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
    : "Tap to choose";

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
          <Text style={styles.pickerDoneBtnText}>Done</Text>
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 56,
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
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Animated.View style={refAnim}>
          <Text style={styles.successRef}>Ref: {bookingRef}</Text>
        </Animated.View>
        <Text style={styles.successMsg}>
          Present this reference at pickup. We sent a confirmation to {email || "your inbox"}.
        </Text>
        {/* Both buttons route explicitly — fall-through to /(tabs)/ would land
            an admin/sales user on their dashboard since they don't have a Rent
            tab in their nav. /rent/my-bookings works for every authenticated
            account. */}
        <Pressable style={styles.doneBtn} onPress={() => router.replace("/rent/my-bookings")}>
          <Text style={styles.doneBtnText}>View My Bookings</Text>
        </Pressable>
        <Pressable style={styles.myBookingsBtn} onPress={() => router.replace("/(tabs)/rent")}>
          <Text style={styles.myBookingsBtnText}>Back to Browse</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
