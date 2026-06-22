import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";

interface Props {
  value: string;
  onChange: (next: string) => void;
}

// Optional delivery drop-off location, captured as a Google Maps link the
// customer pastes from the Maps share sheet. Blank = store pickup. The button
// opens Google Maps (the pasted pin if one is present, else a fresh search) so
// the customer can grab their location link without leaving the flow. A native
// "use my current location" (expo-location) button lands in the next build.
export function DropoffLocationField({ value, onChange }: Props): React.JSX.Element {
  const t = useT();
  const { palette } = useTheme();

  const looksLikeMaps =
    value.trim() === "" || /(google\.|maps\.google|goo\.gl)/i.test(value.trim());

  const openMaps = (): void => {
    const target = value.trim() && looksLikeMaps ? value.trim() : "https://www.google.com/maps";
    void Linking.openURL(target).catch(() => {
      void Linking.openURL("https://www.google.com/maps");
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: palette.muted }]}>{t("dropoff.label")}</Text>
      <View
        style={[styles.inputRow, { backgroundColor: palette.card, borderColor: palette.border }]}
      >
        <Ionicons name="location-outline" size={18} color={palette.muted} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={t("dropoff.placeholder")}
          placeholderTextColor={palette.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[styles.input, { color: palette.text }]}
        />
        <Pressable onPress={openMaps} hitSlop={8} style={styles.mapsBtn}>
          <Ionicons name="map" size={16} color="#2B0FF8" />
          <Text style={styles.mapsBtnText}>{t("dropoff.openMaps")}</Text>
        </Pressable>
      </View>
      <Text style={[styles.helper, { color: palette.muted }]}>
        {value.trim() === "" || looksLikeMaps ? t("dropoff.helper") : t("dropoff.invalidHint")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: { flex: 1, fontSize: 14, paddingVertical: 8 },
  mapsBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  mapsBtnText: { color: "#2B0FF8", fontSize: 12, fontWeight: "700" },
  helper: { fontSize: 11, lineHeight: 15 },
});
