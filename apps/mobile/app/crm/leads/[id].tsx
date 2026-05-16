import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../../../lib/api";

interface Activity {
  id: string;
  type: string;
  note?: string | null;
  createdAt: string;
}

interface Lead {
  id: string;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  status: string;
  estimatedValue: number | string;
  source?: string;
  activities?: Activity[];
}

const STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"];

export default function LeadDetail(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState("");

  const leadQ = useQuery({
    queryKey: ["crm", "lead", id],
    queryFn: async (): Promise<Lead> => {
      const r = await api.crmLead(id!);
      return r.data as unknown as Lead;
    },
    enabled: !!id,
  });

  const logActivity = useMutation({
    mutationFn: async (input: { type: string; note?: string; nextStatus?: string }) =>
      api.crmLogActivity(id!, input),
    onSuccess: async () => {
      setNote("");
      await qc.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (err) =>
      Alert.alert("Couldn't update", err instanceof Error ? err.message : "Try again"),
  });

  const lead = leadQ.data;

  return (
    <>
      <Stack.Screen
        options={{
          title: lead?.contactName ?? "Lead",
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <View style={styles.root}>
        {leadQ.isLoading || !lead ? (
          <ActivityIndicator color={colors.brand.trendyPink} style={{ marginTop: 24 }} />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 200, gap: 14 }}>
            <View style={styles.card}>
              <Text style={styles.name}>{lead.contactName}</Text>
              <Text style={styles.value}>EGP {Number(lead.estimatedValue).toLocaleString()}</Text>
              <View style={styles.contactRow}>
                {lead.contactPhone && (
                  <Pressable
                    style={styles.contactBtn}
                    onPress={() => void Linking.openURL(`tel:${lead.contactPhone}`)}
                  >
                    <Ionicons name="call" size={14} color="#fff" />
                    <Text style={styles.contactBtnText}>Call</Text>
                  </Pressable>
                )}
                {lead.contactPhone && (
                  <Pressable
                    style={[styles.contactBtn, { backgroundColor: "#25D366" }]}
                    onPress={() =>
                      void Linking.openURL(
                        `https://wa.me/${lead.contactPhone?.replace(/[^0-9]/g, "")}`,
                      )
                    }
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                    <Text style={styles.contactBtnText}>WhatsApp</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Stage</Text>
              <View style={styles.stageRow}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() =>
                      logActivity.mutate({
                        type: "status_change",
                        note: `Moved to ${s}`,
                        nextStatus: s,
                      })
                    }
                    style={[
                      styles.stage,
                      lead.status === s && { backgroundColor: colors.brand.trendyPink },
                    ]}
                  >
                    <Text style={[styles.stageText, lead.status === s && { color: "#fff" }]}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Log activity</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="What happened? (call summary, next steps, etc.)"
                placeholderTextColor={colors.text.secondary}
                style={styles.noteInput}
              />
              <Pressable
                style={[styles.logBtn, !note.trim() && { opacity: 0.4 }]}
                disabled={!note.trim() || logActivity.isPending}
                onPress={() => logActivity.mutate({ type: "note", note: note.trim() })}
              >
                <Text style={styles.logBtnText}>
                  {logActivity.isPending ? "Saving…" : "Save note"}
                </Text>
              </Pressable>
            </View>

            {(lead.activities ?? []).length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Recent activity</Text>
                {(lead.activities ?? []).slice(0, 10).map((a) => (
                  <View key={a.id} style={styles.activityRow}>
                    <View style={styles.activityDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityType}>{a.type.replace(/_/g, " ")}</Text>
                      {a.note && <Text style={styles.activityNote}>{a.note}</Text>}
                      <Text style={styles.activityDate}>
                        {new Date(a.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
    gap: 10,
  },
  name: { color: colors.text.light, fontSize: 20, fontWeight: "700" },
  value: { color: colors.brand.trendyPink, fontWeight: "700" },
  contactRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand.friendlyBlue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  contactBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  sectionTitle: { color: colors.text.secondary, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  stageRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  stage: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  stageText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  noteInput: {
    backgroundColor: colors.dark.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
    color: colors.text.light,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  logBtn: {
    backgroundColor: colors.brand.trendyPink,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  logBtnText: { color: "#fff", fontWeight: "700" },
  activityRow: { flexDirection: "row", gap: 10, paddingVertical: 8 },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.trendyPink,
    marginTop: 6,
  },
  activityType: {
    color: colors.text.light,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  activityNote: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
  activityDate: { color: colors.text.secondary, fontSize: 10, marginTop: 4 },
});
