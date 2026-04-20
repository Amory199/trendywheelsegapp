import { colors, spacing, typography, borderRadius } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";

export default function PhoneScreen(): JSX.Element {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  const handleSendOtp = (): void => {
    // TODO: Call API to send OTP
    router.push({ pathname: "/(auth)/otp", params: { phone } });
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
          style={[styles.button, !phone && styles.buttonDisabled]}
          onPress={handleSendOtp}
          disabled={!phone}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Send OTP</Text>
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
