import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { applyLanguage, useLocale } from "../lib/locale";

// First-launch language gate. Shown ONCE, before login, until the user picks a
// language (owner directive: language is chosen before entering the app, not
// from within). The Settings screen keeps its own switch for later changes.
// Picking Arabic flips RTL via applyLanguage → app reloads into Arabic; the
// `chosen` flag is persisted FIRST so the gate doesn't reappear after reload.
const LOGO = require("../assets/brand-logo.png");

export function LanguageGate(): React.JSX.Element | null {
  const hydrated = useLocale((s) => s.hydrated);
  const chosen = useLocale((s) => s.chosen);
  const markChosen = useLocale((s) => s.markChosen);
  const [busy, setBusy] = useState(false);

  if (!hydrated || chosen) return null;

  const pick = async (locale: "en" | "ar"): Promise<void> => {
    if (busy) return;
    setBusy(true);
    await markChosen(); // persist BEFORE applyLanguage (which may reload for RTL)
    await applyLanguage(locale);
  };

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.root}>
      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.logoWrap}>
        <Image source={LOGO} style={styles.logo} contentFit="contain" />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(220).springify()}>
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.titleAr}>اختر لغتك</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.options}>
        <Pressable
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          onPress={() => void pick("en")}
        >
          <Text style={styles.flag}>🇬🇧</Text>
          <Text style={styles.optionLabel}>English</Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          onPress={() => void pick("ar")}
        >
          <Text style={styles.flag}>🇪🇬</Text>
          <Text style={styles.optionLabel}>العربية</Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      </Animated.View>

      <Text style={styles.hint}>You can change this later in Settings · يمكنك تغييرها لاحقًا</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10001,
    backgroundColor: colors.dark.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 28,
  },
  logoWrap: { alignItems: "center", marginBottom: 8 },
  logo: { width: 200, height: 116 },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center" },
  titleAr: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  options: { width: "100%", maxWidth: 360, gap: 12 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  optionPressed: { borderColor: colors.brand.trendyPink, transform: [{ scale: 0.99 }] },
  flag: { fontSize: 26 },
  optionLabel: { flex: 1, color: "#fff", fontSize: 18, fontWeight: "700" },
  arrow: { color: colors.brand.trendyPink, fontSize: 20, fontWeight: "800" },
  hint: { color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center" },
});
