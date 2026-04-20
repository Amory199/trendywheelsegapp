import { colors, spacing, typography, borderRadius } from "@trendywheels/ui-tokens";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";

import { useAuth } from "../../lib/auth-store";

export default function OtpScreen(): JSX.Element {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const verifyOtp = useAuth((s) => s.verifyOtp);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (): Promise<void> => {
    setLoading(true);
    try {
      await verifyOtp(phone ?? "", otp);
      router.replace("/(tabs)/rent");
    } catch (err) {
      Alert.alert("Verification failed", err instanceof Error ? err.message : "Try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Number</Text>
        <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor={colors.text.placeholder}
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          maxLength={6}
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.button, (otp.length !== 6 || loading) && styles.buttonDisabled]}
          onPress={() => void handleVerify()}
          disabled={otp.length !== 6 || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{loading ? "Verifying…" : "Verify"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    justifyContent: "center",
    padding: spacing.lg,
  },
  content: {
    alignItems: "center",
  },
  title: {
    fontSize: typography.fontSize.h1,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
    marginBottom: spacing["2xl"],
  },
  input: {
    width: "100%",
    height: 56,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.h2,
    color: colors.text.light,
    backgroundColor: colors.dark.card,
    marginBottom: spacing.lg,
    letterSpacing: 8,
  },
  button: {
    width: "100%",
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: typography.fontSize.bodyLarge,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.bg,
  },
});
