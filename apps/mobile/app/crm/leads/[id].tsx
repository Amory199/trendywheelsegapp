import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-store";
import { followUpAfterNoAnswer, initialGreeting } from "../../../lib/lead-templates";
import { playSound } from "../../../lib/sounds";
import { useTheme } from "../../../lib/use-theme";

import { CadenceStrip, type CrmRules } from "../../../components/crm-leads/CadenceStrip";
import { DetailField } from "../../../components/crm-leads/DetailField";
import { LeadActionsBar } from "../../../components/crm-leads/LeadActionsBar";
import { makeStyles } from "../../../components/crm-leads/styles";

type ActivityType =
  | "note"
  | "call"
  | "email"
  | "call_attempted"
  | "call_answered"
  | "call_no_answer"
  | "whatsapp_sent";

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
  ownerId?: string | null;
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

// "lost" removed (2026-05-20 round-3) — see app/crm/pipeline.tsx for rationale.
// Sales rotates leads they can't progress; admin sees inactive pool separately.
const STATUSES = ["new", "contacted", "qualified", "proposal", "won"];
type Tab = "activity" | "details" | "vehicles";

export default function LeadDetail(): React.JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
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

  // Replaces the old "Mark Lost" / Claim affordances. Sales presses "Pass to
  // next agent" when they can't progress a lead; the backend rotates it to a
  // fresh round-robin pick (excluding everyone who has already tried), or
  // parks it inactive after 5 distinct agents.
  const rotate = useMutation({
    mutationFn: async () => api.crmRotateLead(id!),
    onSuccess: async (resp) => {
      await qc.invalidateQueries({ queryKey: ["crm"] });
      if (resp.data.status === "inactive") {
        Alert.alert("Moved to inactive", "All agents have tried this lead — admin can review it.");
        router.back();
      } else {
        Alert.alert("Passed on", "Lead has been reassigned to another agent.");
        router.back();
      }
    },
    onError: (e) => Alert.alert("Rotate failed", e instanceof Error ? e.message : "Try again"),
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

  // ── AppState listener (stale-closure-proof) ─────────────────────────────
  // The useEffect that subscribes runs ONCE (empty deps). If we called
  // `askCallOutcome` directly from inside the change handler, that closure
  // captures the FIRST render's `lead` / `rules` — which are typically
  // undefined on mount because leadQ is still loading. By the time the agent
  // returns from the dialer, the captured `lead` is still undefined and the
  // alert never fires.
  //
  // Fix: route both handlers through refs so the listener always reads the
  // CURRENT versions. We also log every transition under __DEV__ so future
  // debugging is one log line away.
  const askCallOutcomeRef = useRef(askCallOutcome);
  const confirmWhatsAppSentRef = useRef(confirmWhatsAppSent);
  useEffect(() => {
    askCallOutcomeRef.current = askCallOutcome;
    confirmWhatsAppSentRef.current = confirmWhatsAppSent;
  });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      const pc = pendingCallRef.current;
      if (__DEV__) console.log("[lead] AppState change:", s, "pendingCall:", pc?.awaiting);
      if (s !== "active" || !pc) return;
      if (Date.now() - pc.startedAt < 3000) return;
      if (pc.awaiting === "outcome") askCallOutcomeRef.current();
      else if (pc.awaiting === "whatsapp") confirmWhatsAppSentRef.current();
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
          <Ionicons name="chevron-back" size={24} color={palette.text} />
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

            <LeadActionsBar
              contactPhone={lead.contactPhone}
              isAdmin={isAdmin}
              canPass={!!lead.ownerId}
              onCall={() => void onCallPressed()}
              onWhatsApp={async () => {
                // Seed the AppState listener so the return-to-app prompt
                // ("Did they reply?") fires the same way the call flow does.
                const digits = lead.contactPhone?.replace(/[^0-9]/g, "") ?? "";
                setPendingCall({
                  phone: digits,
                  startedAt: Date.now(),
                  awaiting: "whatsapp",
                });
                try {
                  await logActivity.mutateAsync({
                    type: "whatsapp_sent",
                    body: "Opened WhatsApp",
                  });
                } catch {
                  // Swallow like the Call path — log failure shouldn't block.
                }
                const text = encodeURIComponent(initialGreeting(lead.contactName));
                void Linking.openURL(`https://wa.me/${digits}?text=${text}`);
              }}
              onPass={() => rotate.mutate()}
              onReassign={() => setReassignModal(true)}
            />

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
                    placeholderTextColor={palette.muted}
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
                    <Ionicons name="car-outline" size={36} color={palette.muted} />
                    <Text style={styles.emptyText}>No vehicles attached yet</Text>
                  </View>
                ) : (
                  attachedFromActivities.map((v) => (
                    <View key={v.vehicleId} style={styles.vehicleRow}>
                      <Ionicons name="car-sport" size={20} color={colors.brand.poolBlue} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vehicleName}>{v.label}</Text>
                        {v.intent ? (
                          <Text style={{ color: palette.muted, fontSize: 11 }}>
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
              <Ionicons name="search" size={16} color={palette.muted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by name or category…"
                placeholderTextColor={palette.muted}
                value={vehicleSearch}
                onChangeText={setVehicleSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {vehicleSearch.length > 0 ? (
                <Pressable onPress={() => setVehicleSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={palette.muted} />
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
                    <Text style={{ color: palette.muted }}>No matches</Text>
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
