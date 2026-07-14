import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../lib/locale";
import { useRTL } from "../lib/typography";
import { useTheme } from "../lib/use-theme";

const STORAGE_KEY = "tw_deliver_area";
const DEFAULT_AREA = "Cairo, Egypt";

// Delivery service areas TrendyWheels covers. Proper nouns → no translation
// needed; the surrounding chrome ("Deliver to") stays localized via useT.
const AREAS = [
  "Cairo, Egypt",
  "New Cairo",
  "Nasr City",
  "Heliopolis",
  "Maadi",
  "6th of October",
  "Sheikh Zayed",
  "Giza",
  "Alexandria",
  "North Coast (Sahel)",
  "Ain Sokhna",
  "Mansoura",
  "Hurghada",
];

/**
 * The home header "Deliver to <area>" pill. Tapping opens a picker of the
 * service areas; the choice persists (SecureStore) and shows in the pill.
 * Replaces the old pill that just bounced to /search and did nothing useful.
 */
export function DeliverAreaPicker(): JSX.Element {
  const t = useT();
  const rtl = useRTL();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [area, setArea] = useState(DEFAULT_AREA);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void SecureStore.getItemAsync(STORAGE_KEY).then((v: string | null) => {
      if (v) setArea(v);
    });
  }, []);

  const choose = (next: string): void => {
    setArea(next);
    setOpen(false);
    void SecureStore.setItemAsync(STORAGE_KEY, next);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={6} style={styles.pill}>
        <Ionicons name="location-outline" size={14} color="#fff" />
        <View style={styles.pillText}>
          <Text style={styles.pillLabel} numberOfLines={1}>
            {t("home.deliverTo")}
          </Text>
          <Text style={styles.pillArea} numberOfLines={1}>
            {area}
          </Text>
        </View>
        <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={14} color="#fff" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: palette.card, paddingBottom: insets.bottom + 12 },
          ]}
        >
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: palette.text }]}>{t("home.deliverTo")}</Text>
          <FlatList
            data={AREAS}
            keyExtractor={(a) => a}
            style={{ maxHeight: 380 }}
            renderItem={({ item }) => {
              const active = item === area;
              return (
                <Pressable
                  onPress={() => choose(item)}
                  style={[styles.row, { borderBottomColor: palette.border }]}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={active ? "#FF0065" : palette.muted}
                  />
                  <Text
                    style={[
                      styles.rowText,
                      {
                        color: active ? "#FF0065" : palette.text,
                        fontWeight: active ? "800" : "500",
                      },
                    ]}
                  >
                    {item}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={18} color="#FF0065" /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  pillText: { flex: 1 },
  pillLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  pillArea: { color: "#fff", fontSize: 15, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, fontSize: 16 },
});
