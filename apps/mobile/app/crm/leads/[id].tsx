import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-store";
import { followUpAfterNoAnswer } from "../../../lib/lead-templates";
import { playSound } from "../../../lib/sounds";

type ActivityType =
  | "note"
  | "call"
  | "email"
  | "call_attempted"
  | "call_answered"
  | "call_no_answer"
  | "whatsapp_sent";

interface CrmRules {
  firstCallWithinMinutes: number;
  followUpCallWithinHours: number;
  maxCallsBeforeReassign: number;
  requireMessageAfterCall: boolean;
}

const DEFAULT_RULES: CrmRules = {
  firstCallWithinMinutes: 120,
  followUpCallWithinHours: 4,
  maxCallsBeforeReassign: 4,
  requireMessageAfterCall: true,
};

interface Activity {
  id: string;
  type: string;
  body?: string | null;
  note?: string | null;
  metadata?: { vehicleId?: string; intent?: string } | null;
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
  callCount?: number;
  messageCount?: number;
  lastCallAt?: string | null;
  lastMessageAt?: string | null;
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
  const router = useRouter();
  const me = useAuth((s) => s.user);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("activity");
  const [note, setNote] = useState("");
  const [form, setForm] = useState<Partial<Lead>>({});
  const [vehicleModal, setVehicleModal] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [reassignModal, setReassignModal] = useState(false);
  // Tracks an in-flight call so we can prompt the agent for the outcome when
  // they return to the app. The `awaiting` field walks the prompt chain:
  //   "outcome" → "Did they answer?"
  //   "whatsapp" → "Did you send the WhatsApp follow-up?"
  const [pendingCall, setPendingCall] = useState<{
    phone: string;
    startedAt: number;
    awaiting: "outcome" | "whatsapp";
  } | null>(null);
  // useRef gives the AppState listener access to the current pendingCall
  // without forcing a re-subscribe on every state mutation.
  const pendingCallRef = useRef(pendingCall);
  useEffect(() => {
    pendingCallRef.current = pendingCall;
  }, [pendingCall]);

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

  // Persist an activity (free-text note OR strict-cadence call/WhatsApp event).
  // The mutation parameter is typed wide; backend Zod schema gates accepted
  // values (mirrors validators/createLeadActivitySchema).
  const logActivity = useMutation({
    mutationFn: async (input: { type: ActivityType; body: string }) =>
      api.crmLogActivity(id!, input),
    onSuccess: async () => {
      setNote("");
      await qc.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (e) => Alert.alert("Couldn't update", e instanceof Error ? e.message : "Try again"),
  });

  // CRM cadence rules — admin can tune live via /crm/rules. Fall back to the
  // bundled defaults (matched to the schema defaults) if the fetch fails so
  // the call button never breaks because of a network hiccup.
  const rulesQ = useQuery({
    queryKey: ["crm", "rules"],
    queryFn: async (): Promise<CrmRules> => {
      const r = (await api.crmRules?.()) as { data: Partial<CrmRules> } | undefined;
      const d = r?.data ?? {};
      return {
        firstCallWithinMinutes: d.firstCallWithinMinutes ?? DEFAULT_RULES.firstCallWithinMinutes,
        followUpCallWithinHours: d.followUpCallWithinHours ?? DEFAULT_RULES.followUpCallWithinHours,
        maxCallsBeforeReassign: d.maxCallsBeforeReassign ?? DEFAULT_RULES.maxCallsBeforeReassign,
        requireMessageAfterCall: d.requireMessageAfterCall ?? DEFAULT_RULES.requireMessageAfterCall,
      };
    },
  });
  const rules: CrmRules = rulesQ.data ?? DEFAULT_RULES;

  // Stage change uses PATCH /leads/:id — activities endpoint only accepts
  // note/call/email types, not status transitions.
  const moveStage = useMutation({
    mutationFn: async (nextStatus: string) => api.crmUpdateLead(id!, { status: nextStatus }),
    onSuccess: async (_data, nextStatus) => {
      playSound(nextStatus === "won" ? "celebrate" : "success");
      await qc.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (e) => {
      playSound("error");
      Alert.alert("Couldn't move stage", e instanceof Error ? e.message : "Try again");
    },
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
      playSound("success");
      setVehicleModal(false);
      setVehicleSearch("");
      await qc.invalidateQueries({ queryKey: ["crm"] });
      Alert.alert("Attached", "Vehicle matched to this lead.");
    },
    onError: (e) => {
      playSound("error");
      Alert.alert("Attach failed", e instanceof Error ? e.message : "Try again");
    },
  });

  const lead = leadQ.data;
  const isAdmin = me?.accountType === "admin";

  // ── Strict cadence helpers ─────────────────────────────────────────────
  // Inspect lead.callCount + lead.lastCallAt + lead.messageCount against the
  // CrmRules and decide whether the next call is allowed. Returns a reason
  // string when blocked so the alert can explain WHY the agent has to wait.
  function callBlockedReason(): string | null {
    if (!lead) return "Lead not loaded yet";
    if ((lead.callCount ?? 0) >= rules.maxCallsBeforeReassign) {
      return `You've hit ${rules.maxCallsBeforeReassign} call attempts on this lead. It will rotate to another agent automatically.`;
    }
    if (lead.lastCallAt) {
      const elapsedMs = Date.now() - new Date(lead.lastCallAt).getTime();
      const gapMs = rules.followUpCallWithinHours * 3600_000;
      if (elapsedMs < gapMs) {
        const next = new Date(new Date(lead.lastCallAt).getTime() + gapMs);
        return `Wait until ${next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — calls must be ${rules.followUpCallWithinHours}h apart.`;
      }
    }
    return null;
  }

  // Prompt chain after the call: outcome → optional WhatsApp follow-up.
  function askWhatsAppFollowUp(phone: string, name: string): void {
    const wa = phone.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(followUpAfterNoAnswer(name));
    Alert.alert(
      "Send WhatsApp follow-up?",
      "After a no-answer the rule is to send a quick WhatsApp.",
      [
        {
          text: "Skip",
          style: "cancel",
          onPress: () => setPendingCall(null),
        },
        {
          text: "Open WhatsApp",
          onPress: () => {
            setPendingCall((prev) =>
              prev ? { ...prev, awaiting: "whatsapp", startedAt: Date.now() } : prev,
            );
            void Linking.openURL(`whatsapp://send?phone=${wa}&text=${msg}`);
          },
        },
      ],
    );
  }

  function confirmWhatsAppSent(): void {
    Alert.alert("Message sent?", "Confirm you sent the WhatsApp follow-up.", [
      {
        text: "Not yet",
        style: "cancel",
        onPress: () => setPendingCall(null),
      },
      {
        text: "Yes, sent",
        onPress: () => {
          logActivity.mutate({ type: "whatsapp_sent", body: "WhatsApp follow-up sent" });
          playSound("success");
          setPendingCall(null);
        },
      },
    ]);
  }

  function askCallOutcome(): void {
    if (!lead) return;
    Alert.alert("Did they answer?", `${lead.contactName} — log the outcome.`, [
      {
        text: "No answer",
        onPress: () => {
          logActivity.mutate({ type: "call_no_answer", body: "No answer on call" });
          if (rules.requireMessageAfterCall && lead.contactPhone) {
            askWhatsAppFollowUp(lead.contactPhone, lead.contactName);
          } else {
            setPendingCall(null);
          }
        },
      },
      {
        text: "Yes, answered",
        onPress: () => {
          logActivity.mutate({ type: "call_answered", body: "Customer answered" });
          playSound("success");
          setPendingCall(null);
          // Soft nudge to advance the pipeline — sales typically moves to
          // Contacted or Qualified right after a successful first call.
          setTimeout(() => {
            Alert.alert("Move stage?", "Where does the lead sit now?", [
              { text: "Leave as is", style: "cancel" },
              { text: "Contacted", onPress: () => moveStage.mutate("contacted") },
              { text: "Qualified", onPress: () => moveStage.mutate("qualified") },
            ]);
          }, 400);
        },
      },
    ]);
  }

  async function onCallPressed(): Promise<void> {
    if (!lead?.contactPhone) return;
    const blocked = callBlockedReason();
    if (blocked) {
      Alert.alert("Hold on", blocked);
      return;
    }
    try {
      await logActivity.mutateAsync({
        type: "call_attempted",
        body: `Dialing ${lead.contactPhone}`,
      });
    } catch {
      // Swallow — if the activity write fails we still let the agent place
      // the call. The sweep will re-detect them as stale and reassign anyway.
    }
    setPendingCall({ phone: lead.contactPhone, startedAt: Date.now(), awaiting: "outcome" });
    void Linking.openURL(`tel:${lead.contactPhone}`);
  }

  // AppState listener: when the app returns to "active" 3s+ after a call was
  // placed, prompt for the outcome (or the WhatsApp confirm if we're mid-
  // chain). Single subscription for the lifetime of the screen.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      const pc = pendingCallRef.current;
      if (s !== "active" || !pc) return;
      if (Date.now() - pc.startedAt < 3000) return;
      if (pc.awaiting === "outcome") askCallOutcome();
      else if (pc.awaiting === "whatsapp") confirmWhatsAppSent();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attached vehicles are recorded as activities of type "matched". Use the
  // most recent activity per vehicleId so a re-attach replaces the prior
  // entry visually.
  const attachedFromActivities = (() => {
    const map = new Map<
      string,
      { vehicleId: string; label: string; intent?: string; when: string }
    >();
    for (const a of lead?.activities ?? []) {
      if (a.type !== "matched") continue;
      const vid = a.metadata?.vehicleId;
      if (!vid) continue;
      if (map.has(vid)) continue;
      map.set(vid, {
        vehicleId: vid,
        label: a.body ?? "Vehicle",
        intent: a.metadata?.intent,
        when: a.createdAt,
      });
    }
    return Array.from(map.values());
  })();

  const filteredVehiclesForModal = (() => {
    const q = vehicleSearch.trim().toLowerCase();
    const list = vehiclesQ.data ?? [];
    if (!q) return list;
    return list.filter((v) => `${v.name} ${v.category ?? ""}`.toLowerCase().includes(q));
  })();

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {lead?.contactName ?? "Lead"}
        </Text>
        <View style={{ width: 24 }} />
      </View>
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
                <Text style={styles.value}>EGP {Number(lead.estimatedValue).toLocaleString()}</Text>
                <View style={styles.stageChip}>
                  <Text style={styles.stageChipText}>{lead.status}</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionsRow}>
              {lead.contactPhone ? (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.brand.friendlyBlue }]}
                  onPress={() => void onCallPressed()}
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

            {/* Cadence chips — 4 calls / 4 messages per 2 days, ≥4h between */}
            <CadenceStrip
              calls={lead.callCount ?? 0}
              messages={lead.messageCount ?? 0}
              lastCallAt={lead.lastCallAt ?? null}
              rules={rules}
            />
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
                        onPress={() => moveStage.mutate(s)}
                        disabled={moveStage.isPending}
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
                    onPress={() => logActivity.mutate({ type: "note", body: note.trim() })}
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
                {attachedFromActivities.length === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons name="car-outline" size={36} color={colors.text.secondary} />
                    <Text style={styles.emptyText}>No vehicles attached yet</Text>
                  </View>
                ) : (
                  attachedFromActivities.map((v) => (
                    <View key={v.vehicleId} style={styles.vehicleRow}>
                      <Ionicons name="car-sport" size={20} color={colors.brand.poolBlue} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vehicleName}>{v.label}</Text>
                        {v.intent ? (
                          <Text style={{ color: colors.text.secondary, fontSize: 11 }}>
                            {v.intent === "sell" ? "For sale" : "For rent"}
                          </Text>
                        ) : null}
                      </View>
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
            <View style={styles.modalSearch}>
              <Ionicons name="search" size={16} color={colors.text.secondary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by name or category…"
                placeholderTextColor={colors.text.secondary}
                value={vehicleSearch}
                onChangeText={setVehicleSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {vehicleSearch.length > 0 ? (
                <Pressable onPress={() => setVehicleSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.text.secondary} />
                </Pressable>
              ) : null}
            </View>
            {vehiclesQ.isLoading ? (
              <ActivityIndicator color={colors.brand.trendyPink} />
            ) : (
              <FlatList
                data={filteredVehiclesForModal}
                keyExtractor={(v) => v.id}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={{ padding: 24, alignItems: "center" }}>
                    <Text style={{ color: colors.text.secondary }}>No matches</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.vehiclePickerRow}
                    onPress={() => attach.mutate(item.id)}
                    disabled={attach.isPending}
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
  );
}

function CadenceStrip({
  calls,
  messages,
  lastCallAt,
  rules,
}: {
  calls: number;
  messages: number;
  lastCallAt: string | null;
  rules: CrmRules;
}): React.JSX.Element {
  const callsBad = calls >= rules.maxCallsBeforeReassign;
  const msgsBad = messages >= rules.maxCallsBeforeReassign;
  let nextLabel = "Ready";
  let nextBad = false;
  if (lastCallAt) {
    const next = new Date(lastCallAt).getTime() + rules.followUpCallWithinHours * 3600_000;
    if (next > Date.now()) {
      nextLabel = `Next ${new Date(next).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      nextBad = true;
    }
  }
  const cadenceChip = (label: string, value: string, bad: boolean): React.JSX.Element => (
    <View
      style={[
        styles.cadenceChip,
        { backgroundColor: bad ? "rgba(255,72,72,0.15)" : "rgba(0,200,120,0.15)" },
      ]}
    >
      <Text style={[styles.cadenceChipLabel, { color: bad ? "#FF8888" : "#3DD68C" }]}>{label}</Text>
      <Text style={styles.cadenceChipValue}>{value}</Text>
    </View>
  );
  return (
    <View style={styles.cadenceRow}>
      {cadenceChip("Calls", `${calls}/${rules.maxCallsBeforeReassign}`, callsBad)}
      {cadenceChip("Msgs", `${messages}/${rules.maxCallsBeforeReassign}`, msgsBad)}
      {cadenceChip("Cadence", nextLabel, nextBad)}
    </View>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.dark.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  topBarTitle: {
    color: colors.text.light,
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
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
  cadenceRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  cadenceChip: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  cadenceChipLabel: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cadenceChipValue: { color: colors.text.light, fontSize: 12, fontWeight: "700", marginTop: 1 },
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
  modalTitle: { color: colors.text.light, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
  },
  modalSearchInput: { flex: 1, color: colors.text.light, fontSize: 14, paddingVertical: 0 },
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
