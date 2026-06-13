import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClientError } from "@trendywheels/api-client";
import { colors, spacing } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { logEvent } from "../lib/analytics";
import { api } from "../lib/api";
import { useT } from "../lib/locale";

interface ReviewModalProps {
  visible: boolean;
  bookingId: string;
  vehicleId: string;
  vehicleName?: string;
  onClose: () => void;
  // Fired when the booking is known to be reviewed (success OR a 409 from the
  // server) so the caller can hide its "Rate your rental" button.
  onReviewed: (bookingId: string) => void;
}

export function ReviewModal({
  visible,
  bookingId,
  vehicleId,
  vehicleName,
  onClose,
  onReviewed,
}: ReviewModalProps): JSX.Element {
  const qc = useQueryClient();
  const t = useT();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.submitBookingReview(bookingId, {
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logEvent("review_submitted", { vehicle_id: vehicleId, rating });
      void qc.invalidateQueries({ queryKey: ["my-bookings"] });
      void qc.invalidateQueries({ queryKey: ["vehicle-reviews", vehicleId] });
      void qc.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
      onReviewed(bookingId);
      setSubmitted(true);
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.statusCode === 409) {
        onReviewed(bookingId);
        onClose();
        Alert.alert(
          t("components.review.alreadyReviewedTitle"),
          t("components.review.alreadyReviewedMessage"),
        );
        return;
      }
      setError(err instanceof Error ? err.message : t("components.review.genericError"));
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          {submitted ? (
            <View style={styles.successWrap}>
              <Ionicons name="checkmark-circle" size={56} color={colors.success} />
              <Text style={styles.successTitle}>{t("components.review.successTitle")}</Text>
              <Text style={styles.successHint}>{t("components.review.successHint")}</Text>
              <Pressable style={[styles.submitBtn, { alignSelf: "stretch" }]} onPress={onClose}>
                <Text style={styles.submitBtnText}>{t("components.review.done")}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.heading}>{t("components.review.heading")}</Text>
              {vehicleName ? (
                <Text style={styles.subheading} numberOfLines={1}>
                  {vehicleName}
                </Text>
              ) : null}

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Pressable
                    key={i}
                    hitSlop={6}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setRating(i);
                    }}
                  >
                    <Ionicons
                      name={i <= rating ? "star" : "star-outline"}
                      size={36}
                      color="#F5B800"
                    />
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder={t("components.review.titlePlaceholder")}
                placeholderTextColor={colors.text.secondary}
                value={title}
                onChangeText={setTitle}
                maxLength={80}
              />
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder={t("components.review.bodyPlaceholder")}
                placeholderTextColor={colors.text.secondary}
                value={body}
                onChangeText={setBody}
                multiline
                maxLength={1000}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                style={[styles.submitBtn, (rating === 0 || mutation.isPending) && { opacity: 0.5 }]}
                disabled={rating === 0 || mutation.isPending}
                onPress={() => {
                  setError(null);
                  mutation.mutate();
                }}
              >
                {mutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>{t("components.review.submit")}</Text>
                )}
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>{t("components.review.notNow")}</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: { color: colors.text.light, fontSize: 20, fontWeight: "800", textAlign: "center" },
  subheading: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: -spacing.sm,
  },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  input: {
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.light,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: "top" },
  errorText: { color: colors.error, fontSize: 13, textAlign: "center" },
  submitBtn: {
    backgroundColor: colors.brand.trendyPink,
    borderRadius: 12,
    paddingVertical: spacing.sm + 4,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelBtn: { alignItems: "center", paddingVertical: spacing.xs },
  cancelBtnText: { color: colors.text.secondary, fontWeight: "600", fontSize: 14 },
  successWrap: { alignItems: "center", gap: spacing.sm },
  successTitle: { color: colors.text.light, fontSize: 18, fontWeight: "800" },
  successHint: {
    color: colors.text.secondary,
    fontSize: 13,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
});
