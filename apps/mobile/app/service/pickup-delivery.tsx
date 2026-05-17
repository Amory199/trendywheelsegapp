import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useRouter } from "expo-router";
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

export default function PickupDeliveryScreen(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [pickupAt, setPickupAt] = useState<Date>(new Date(Date.now() + 86400000));
  const [showPicker, setShowPicker] = useState(false);
  const [cargoNotes, setCargoNotes] = useState("");

  const canSubmit = fromAddress.trim().length >= 3 && toAddress.trim().length >= 3;

  const submit = useMutation({
    mutationFn: () =>
      api.request("POST", "/api/service/transport", {
        body: {
          fromAddress: fromAddress.trim(),
          toAddress: toAddress.trim(),
          pickupAt: pickupAt.toISOString(),
          cargoNotes: cargoNotes || undefined,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["service", "transport"] });
      Alert.alert("Request received", "We'll confirm pickup within a few hours.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err) =>
      Alert.alert("Couldn't submit", err instanceof Error ? err.message : "Try again"),
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: "Pickup & Delivery",
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
            <Ionicons name="cube" size={32} color={colors.brand.poolBlue} />
            <Text style={styles.title}>Door-to-door transport</Text>
            <Text style={styles.subtitle}>
              Tell us where we're picking up and where it's going. We'll confirm pricing and ETA.
            </Text>
          </View>

          <Text style={styles.label}>Pickup address</Text>
          <TextInput
            value={fromAddress}
            onChangeText={setFromAddress}
            placeholder="Street, district, city"
            placeholderTextColor={colors.text.secondary}
            style={styles.input}
          />

          <Text style={styles.label}>Drop-off address</Text>
          <TextInput
            value={toAddress}
            onChangeText={setToAddress}
            placeholder="Street, district, city"
            placeholderTextColor={colors.text.secondary}
            style={styles.input}
          />

          <Text style={styles.label}>Pickup date</Text>
          <Pressable onPress={() => setShowPicker(true)} style={styles.input}>
            <Text style={styles.inputText}>{pickupAt.toLocaleDateString()}</Text>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={pickupAt}
              mode="date"
              minimumDate={new Date()}
              onChange={(_, d) => {
                setShowPicker(false);
                if (d) setPickupAt(d);
              }}
            />
          )}

          <Text style={styles.label}>Cargo notes (optional)</Text>
          <TextInput
            value={cargoNotes}
            onChangeText={setCargoNotes}
            placeholder="Size, fragility, anything special?"
            placeholderTextColor={colors.text.secondary}
            multiline
            style={[styles.input, styles.textarea]}
          />

          <Pressable
            disabled={!canSubmit || submit.isPending}
            onPress={() => submit.mutate()}
            style={[styles.submitBtn, (!canSubmit || submit.isPending) && { opacity: 0.5 }]}
          >
            {submit.isPending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#000" />
                <Text style={styles.submitBtnText}>Submit request</Text>
              </>
            )}
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
  subtitle: { color: colors.text.secondary, fontSize: 13, textAlign: "center", lineHeight: 19 },
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
  inputText: { color: colors.text.light, fontSize: 14 },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand.poolBlue,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
  },
  submitBtnText: { color: "#000", fontWeight: "700" },
});
