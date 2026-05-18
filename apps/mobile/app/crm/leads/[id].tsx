import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-store";

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
  notes?: string;
  assignedAgentId?: string | null;
  assignedAgent?: { name?: string } | null;
  activities?: Activity[];
  vehicles?: Array<{ id: string; vehicleId: string; vehicle?: { name?: string } }>;
}

interface Vehicle {
  id: string;
  name: string;
  category?: string;
  dailyRate?: number;
}

interface Agent {
  id: string;
  name?: string;
}

const STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"];
type Tab = "activity" | "details" | "vehicles";

export default function LeadDetail(): React.JSX.Element {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("activity");
  const [note, setNote] = useState("");
  const [form, setForm] = useState<Partial<Lead>>({});
  const [vehicleModal, setVehicleModal] = useState(false);
  const [reassignModal, setReassignModal] = useState(false);

  const leadQ = useQuery({
    queryKey: ["crm", "lead", id],
    queryFn: async (): Promise<Lead> => {
      const r = await api.crmLead(id!);
      return r.data as unknown as Lead;
    },
    enabled: !!id,
  });

  const vehiclesQ = useQuery({
    queryKey: ["crm", "inventory"],
    queryFn: async (): Promise<Vehicle[]> => {
      const r = await api.crmInventory();
      return (r.data ?? []) as Vehicle[];
    },
    enabled: vehicleModal,
  });

  const agentsQ = useQuery({
    queryKey: ["admin", "sales-agents"],
    queryFn: async (): Promise<Agent[]> => {
      const r = await api.adminListUsers({ staffRole: "sales" });
      return ((r as { data?: Agent[] }).data ?? []) as Agent[];
    },
    enabled: reassignModal,
  });

  const logActivity = useMutation({
    mutationFn: async (input: { type: string; note?: string; nextStatus?: string }) =>
      api.crmLogActivity(id!, input),
    onSuccess: async () => {
      setNote("");
      await qc.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (e) => Alert.alert("Couldn't update", e instanceof Error ? e.message : "Try again"),
  });

  const updateLead = useMutation({
    mutationFn: async () => api.crmUpdateLead(id!, form as Record<string, unknown>),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["crm"] });
      Alert.alert("Saved", "Lead updated.");
    },
    onError: (e) => Alert.alert("Save failed", e instanceof Error ? e.message : "Try again"),
  });

  const claim = useMutation({
    mutationFn: async () => api.crmClaimLead(id!),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["crm"] }),
    onError: (e) => Alert.alert("Claim failed", e instanceof Error ? e.message : "Try again"),
  });

  const reassign = useMutation({
    mutationFn: async (agentId: string) => api.crmReassignLead(id!, agentId),
    onSuccess: async () => {
      setReassignModal(false);
      await qc.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (e) => Alert.alert("Reassign failed", e instanceof Error ? e.message : "Try again"),
  });

  const attach = useMutation({
    mutationFn: async (vehicleId: string) => api.crmAttachVehicle(id!, vehicleId),
    onSuccess: async () => {
      setVehicleModal(false);
      await qc.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (e) => Alert.alert("Attach failed", e instanceof Error ? e.message : "Try again"),
  });

  const lead = leadQ.data;
  const isAdmin = me?.accountType === "admin";

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
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{lead.contactName}</Text>
                  <Text style={styles.subline}>{lead.contactPhone ?? "No phone"}</Text>
                  {lead.assignedAgent?.name ? (
                    <Text style={styles.assigned}>Owned by {lead.assignedAgent.name}</Text>
                  ) : (
                    <Text style={styles.unassigned}>Unassigned</Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.value}>
                    EGP {Number(lead.estimatedValue).toLocaleString()}
                  </Text>
                  <View style={styles.stageChip}>
                    <Text style={styles.stageChipText}>{lead.status}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionsRow}>
                {lead.contactPhone ? (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: colors.brand.friendlyBlue }]}
                    onPress={() => void Linking.openURL(`tel:${lead.contactPhone}`)}
                  >
                    <Ionicons name="call" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Call</Text>
                  </Pressable>
                ) : null}
                {lead.contactPhone ? (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "#25D366" }]}
                    onPress={() =>
                      void Linking.openURL(
                        `https://wa.me/${lead.contactPhone?.replace(/[^0-9]/g, "")}`,
                      )
                    }
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>WA</Text>
                  </Pressable>
                ) : null}
                {!lead.assignedAgentId ? (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: colors.brand.poolBlue }]}
                    onPress={() => claim.mutate()}
                  >
                    <Ionicons name="hand-left" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Claim</Text>
                  </Pressable>
                ) : isAdmin ? (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: colors.brand.trendyPink }]}
                    onPress={() => setReassignModal(true)}
                  >
                    <Ionicons name="swap-horizontal" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Reassign</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.tabRow}>
              {(["activity", "details", "vehicles"] as Tab[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    setTab(t);
                    if (t === "details" && lead) {
                      setForm({
                        contactName: lead.contactName,
                        contactPhone: lead.contactPhone,
                        contactEmail: lead.contactEmail,
                        estimatedValue: lead.estimatedValue,
                        notes: lead.notes,
                      });
                    }
                  }}
                  style={[styles.tab, tab === t && styles.tabActive]}
                >
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>

            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 200, gap: 12 }}>
              {tab === "activity" && (
                <>
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Move stage</Text>
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
                            lead.status === s && {
                              backgroundColor: colors.brand.trendyPink,
                              borderColor: colors.brand.trendyPink,
                            },
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
                      placeholder="What happened?"
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
                      <Text style={styles.sectionTitle}>Timeline</Text>
                      {(lead.activities ?? []).slice(0, 20).map((a) => (
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
                </>
              )}

              {tab === "details" && (
                <>
                  <DetailField
                    label="Contact name"
                    value={form.contactName ?? ""}
                    onChange={(v) => setForm((s) => ({ ...s, contactName: v }))}
                  />
                  <DetailField
                    label="Phone"
                    value={form.contactPhone ?? ""}
                    onChange={(v) => setForm((s) => ({ ...s, contactPhone: v }))}
                    keyboardType="phone-pad"
                  />
                  <DetailField
                    label="Email"
                    value={form.contactEmail ?? ""}
                    onChange={(v) => setForm((s) => ({ ...s, contactEmail: v }))}
                    keyboardType="email-address"
                  />
                  <DetailField
                    label="Estimated value (EGP)"
                    value={form.estimatedValue?.toString() ?? ""}
                    onChange={(v) => setForm((s) => ({ ...s, estimatedValue: Number(v) as never }))}
                    keyboardType="numeric"
                  />
                  <DetailField
                    label="Notes"
                    value={form.notes ?? ""}
                    onChange={(v) => setForm((s) => ({ ...s, notes: v }))}
                    multiline
                  />
                  <Pressable
                    style={[styles.logBtn, updateLead.isPending && { opacity: 0.5 }]}
                    disabled={updateLead.isPending}
                    onPress={() => updateLead.mutate()}
                  >
                    <Text style={styles.logBtnText}>
                      {updateLead.isPending ? "Saving…" : "Save changes"}
                    </Text>
                  </Pressable>
                </>
              )}

              {tab === "vehicles" && (
                <>
                  {(lead.vehicles ?? []).length === 0 ? (
                    <View style={styles.empty}>
                      <Ionicons name="car-outline" size={36} color={colors.text.secondary} />
                      <Text style={styles.emptyText}>No vehicles attached yet</Text>
                    </View>
                  ) : (
                    (lead.vehicles ?? []).map((v) => (
                      <View key={v.id} style={styles.vehicleRow}>
                        <Ionicons name="car-sport" size={20} color={colors.brand.poolBlue} />
                        <Text style={styles.vehicleName}>{v.vehicle?.name ?? "Vehicle"}</Text>
                      </View>
                    ))
                  )}
                  <Pressable style={styles.attachBtn} onPress={() => setVehicleModal(true)}>
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.attachBtnText}>Attach vehicle</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </>
        )}

        <Modal
          visible={vehicleModal}
          transparent
          animationType="slide"
          onRequestClose={() => setVehicleModal(false)}
        >
          <Pressable style={styles.modalBg} onPress={() => setVehicleModal(false)}>
            <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Attach vehicle</Text>
              {vehiclesQ.isLoading ? (
                <ActivityIndicator color={colors.brand.trendyPink} />
              ) : (
                <FlatList
                  data={vehiclesQ.data ?? []}
                  keyExtractor={(v) => v.id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.vehiclePickerRow}
                      onPress={() => attach.mutate(item.id)}
                    >
                      <Ionicons name="car-sport" size={20} color={colors.brand.poolBlue} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vName}>{item.name}</Text>
                        <Text style={styles.vMeta}>
                          {item.category ?? "—"} · EGP {item.dailyRate ?? "—"}/day
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={reassignModal}
          transparent
          animationType="slide"
          onRequestClose={() => setReassignModal(false)}
        >
          <Pressable style={styles.modalBg} onPress={() => setReassignModal(false)}>
            <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Reassign to</Text>
              {agentsQ.isLoading ? (
                <ActivityIndicator color={colors.brand.trendyPink} />
              ) : (
                <FlatList
                  data={agentsQ.data ?? []}
                  keyExtractor={(a) => a.id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.vehiclePickerRow}
                      onPress={() => reassign.mutate(item.id)}
                    >
                      <Ionicons name="person-circle" size={24} color={colors.brand.trendyPink} />
                      <Text style={styles.vName}>{item.name ?? "Agent"}</Text>
                    </Pressable>
                  )}
                />
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </>
  );
}

function DetailField({
  label,
  value,
  onChange,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  multiline?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        placeholderTextColor={colors.text.secondary}
        style={[styles.noteInput, multiline ? { minHeight: 80 } : { minHeight: 0, paddingTop: 4 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  heroCard: {
    margin: 14,
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
    gap: 12,
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  name: { color: colors.text.light, fontSize: 22, fontWeight: "800" },
  subline: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
  assigned: { color: colors.brand.friendlyBlue, fontSize: 11, fontWeight: "700", marginTop: 4 },
  unassigned: { color: "#F5B800", fontSize: 11, fontWeight: "700", marginTop: 4 },
  value: { color: colors.brand.trendyPink, fontWeight: "800", fontSize: 16 },
  stageChip: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.brand.trendyPink + "22",
  },
  stageChipText: {
    color: colors.brand.trendyPink,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionsRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  actionBtnText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 6,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: "center",
  },
  tabActive: { backgroundColor: colors.brand.trendyPink, borderColor: colors.brand.trendyPink },
  tabText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  tabTextActive: { color: "#fff" },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
    gap: 8,
  },
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
    padding: 10,
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
  logBtnText: { color: "#fff", fontWeight: "800" },
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
  empty: { alignItems: "center", paddingVertical: 30, gap: 6 },
  emptyText: { color: colors.text.secondary, fontSize: 12 },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 10,
  },
  vehicleName: { color: colors.text.light, fontSize: 13, fontWeight: "700" },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand.friendlyBlue,
    paddingVertical: 12,
    borderRadius: 10,
  },
  attachBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: colors.dark.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalTitle: { color: colors.text.light, fontSize: 18, fontWeight: "700", marginBottom: 14 },
  vehiclePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  vName: { color: colors.text.light, fontSize: 14, fontWeight: "700" },
  vMeta: { color: colors.text.secondary, fontSize: 11 },
});
