import { colors, spacing, typography, borderRadius } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";

import { useAuth } from "../../lib/auth-store";

export default function PhoneScreen(): JSX.Element {
  const router = useRouter();
  const sendOtp = useAuth((s) => s.sendOtp);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (): Promise<void> => {
    setLoading(true);
    try {
      await sendOtp(phone);
      router.push({ pathname: "/(auth)/otp", params: { phone } });
    } catch (err) {
      Alert.alert("Could not send OTP", err instanceof Error ? err.message : "Try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to TrendyWheels</Text>
        <Text style={styles.subtitle}>Enter your phone number to get started</Text>

        <TextInput
          style={styles.input}
          placeholder="+20 1XX XXX XXXX"
          placeholderTextColor={colors.text.placeholder}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          maxLength={15}
        />

        <TouchableOpacity
          style={[styles.button, (!phone || loading) && styles.buttonDisabled]}
          onPress={() => void handleSendOtp()}
          disabled={!phone || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{loading ? "Sending…" : "Send OTP"}</Text>
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
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.bodyLarge,
    color: colors.text.secondary,
    marginBottom: spacing["2xl"],
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 44,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.bodyLarge,
    color: colors.text.light,
    backgroundColor: colors.dark.card,
    marginBottom: spacing.lg,
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
