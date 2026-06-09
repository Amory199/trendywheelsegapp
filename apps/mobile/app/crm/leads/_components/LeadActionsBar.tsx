// The horizontal row of action buttons on the lead detail hero card.
// Extracted from the screen so v1.1 features (sales push, inventory toggle,
// viewing requests, cash collection) can slot new buttons in without all
// touching the same render tree.

import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

export interface LeadActionsBarProps {
  contactPhone: string | null | undefined;
  isAdmin: boolean;
  // True when the current sales user owns this lead — controls the "Pass" affordance.
  canPass: boolean;
  onCall: () => void;
  onWhatsApp: () => void;
  onPass: () => void;
  onReassign: () => void;
}

export function LeadActionsBar(p: LeadActionsBarProps): React.ReactElement {
  const confirmPass = (): void => {
    Alert.alert(
      "Pass to next agent?",
      "This lead will be reassigned to another sales agent and removed from your pipeline.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Pass on", style: "destructive", onPress: p.onPass },
      ],
    );
  };

  return (
    <View style={styles.row}>
      {p.contactPhone ? (
        <Pressable
          style={[styles.btn, { backgroundColor: colors.brand.friendlyBlue }]}
          onPress={p.onCall}
        >
          <Ionicons name="call" size={14} color="#fff" />
          <Text style={styles.btnText}>Call</Text>
        </Pressable>
      ) : null}

      {p.contactPhone ? (
        <Pressable style={[styles.btn, { backgroundColor: "#25D366" }]} onPress={p.onWhatsApp}>
          <Ionicons name="logo-whatsapp" size={14} color="#fff" />
          <Text style={styles.btnText}>WA</Text>
        </Pressable>
      ) : null}

      {!p.isAdmin && p.canPass ? (
        <Pressable
          style={[styles.btn, { backgroundColor: colors.brand.poolBlue }]}
          onPress={confirmPass}
        >
          <Ionicons name="swap-horizontal" size={14} color="#fff" />
          <Text style={styles.btnText}>Pass</Text>
        </Pressable>
      ) : null}

      {p.isAdmin ? (
        <Pressable
          style={[styles.btn, { backgroundColor: colors.brand.trendyPink }]}
          onPress={p.onReassign}
        >
          <Ionicons name="swap-horizontal" size={14} color="#fff" />
          <Text style={styles.btnText}>Reassign</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
