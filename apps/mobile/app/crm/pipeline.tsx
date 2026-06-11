import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, initialsOf, type Palette } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { EarningsCard } from "../../components/crm/EarningsCard";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { initialGreeting } from "../../lib/lead-templates";
import { useTheme } from "../../lib/use-theme";

interface Lead {
  id: string;
  contactName: string;
  contactPhone?: string;
  status: string;
  estimatedValue: number | string;
  source?: string;
  lastActivityAt?: string;
  ownerId?: string | null;
}

type FilterKey = "all" | "mine" | "unclaimed" | "stale";

const FILTERS: { key: FilterKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "All", icon: "layers-outline" },
  { key: "mine", label: "Mine", icon: "person-outline" },
  { key: "unclaimed", label: "Open", icon: "flag-outline" },
  { key: "stale", label: "Stale", icon: "alarm-outline" },
];

// "lost" was removed (2026-05-20 round-3). The terminal state for an
// unprogressable lead is now driven by the rotation flow: sales presses "Pass
// to next agent", and after 5 agents have tried, the backend parks the lead
// in the admin-only "inactive" pool. The status value still exists in the DB
// enum for historical rows, but no UI surfaces it.
const STAGES = ["new", "contacted", "qualified", "proposal", "won"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
};

const STAGE_ICON: Record<Stage, keyof typeof Ionicons.glyphMap> = {
  new: "sparkles-outline",
  contacted: "call-outline",
  qualified: "checkmark-circle-outline",
  proposal: "document-text-outline",
  won: "trophy-outline",
};

function relativeTime(iso: string | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function CrmPipeline(): React.JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  // Sales agents are locked to their own assigned leads (backend enforces),
  // so the All / Mine / Open / Stale chips no longer make sense for them.
  // Admins keep the full filter row.
  const isAdmin = user?.accountType === "admin" || user?.staffRole === "admin";
  const userId = user?.id;
  const [stage, setStage] = useState<Stage>("new");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const leadsQ = useQuery({
    queryKey: ["crm", "leads"],
    queryFn: async () => {
      const r = await api.crmLeads();
      return (r.data as Lead[]) ?? [];
    },
  });

  const allLeads = leadsQ.data ?? [];

  // Apply Mine/Unclaimed/Stale filter + search across ALL stages (so the
  // count badges reflect what's actually selectable).
  const STALE_MS = 24 * 60 * 60 * 1000;
  const filteredAll = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allLeads.filter((l) => {
      if (filter === "mine" && l.ownerId !== userId) return false;
      if (filter === "unclaimed" && l.ownerId !== null) return false;
      if (filter === "stale") {
        const last = l.lastActivityAt ? new Date(l.lastActivityAt).getTime() : 0;
        if (Date.now() - last < STALE_MS) return false;
      }
      if (q) {
        const hay = `${l.contactName ?? ""} ${l.contactPhone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allLeads, filter, search, userId, STALE_MS]);

  const counts = useMemo<Record<Stage, number>>(() => {
    return STAGES.reduce(
      (acc, s) => {
        acc[s] = filteredAll.filter((l) => l.status === s).length;
        return acc;
      },
      {} as Record<Stage, number>,
    );
  }, [filteredAll]);

  const stageValue = useMemo<Record<Stage, number>>(() => {
    return STAGES.reduce(
      (acc, s) => {
        acc[s] = filteredAll
          .filter((l) => l.status === s)
          .reduce((sum, l) => sum + Number(l.estimatedValue ?? 0), 0);
        return acc;
      },
      {} as Record<Stage, number>,
    );
  }, [filteredAll]);

  const totalValue = Object.values(stageValue).reduce((a, b) => a + b, 0);
  const currentLeads = filteredAll.filter((l) => l.status === stage);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>SALES · PIPELINE</Text>
          <Text style={styles.title}>Hi, {user?.name?.split(" ")[0] ?? "Sales"}</Text>
        </View>
        <Pressable style={styles.fab} onPress={() => router.push("/crm/leads/new")}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.fabText}>New lead</Text>
        </Pressable>
        <Pressable
          hitSlop={12}
          style={{ marginLeft: 10 }}
          onPress={async () => {
            await logout();
            router.replace("/(auth)/phone");
          }}
        >
          <Ionicons name="log-out-outline" size={22} color={palette.text} />
        </Pressable>
      </View>

      <EarningsCard />

      <View style={[styles.heroCard, { marginTop: 10 }]}>
        <View>
          <Text style={styles.heroLabel}>Total pipeline</Text>
          <Text style={styles.heroValue}>EGP {Math.round(totalValue).toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.heroLabel}>Won this month</Text>
          <View style={styles.wonChip}>
            <Ionicons name="trophy" size={14} color={colors.brand.ecoLimelight ?? "#A9F453"} />
            <Text style={styles.wonText}>{counts.won}</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={palette.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone…"
          placeholderTextColor={palette.muted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>

      {isAdmin ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Ionicons name={f.icon} size={12} color={active ? "#fff" : palette.muted} />
                <Text style={[styles.filterChipText, active && { color: "#fff" }]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stageRow}
      >
        {STAGES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setStage(s)}
            style={[styles.stage, stage === s && styles.stageActive]}
          >
            <Ionicons name={STAGE_ICON[s]} size={14} color={stage === s ? "#fff" : palette.muted} />
            <View>
              <Text style={[styles.stageLabel, stage === s && styles.stageLabelActive]}>
                {STAGE_LABEL[s]}
              </Text>
              <Text style={[styles.stageMeta, stage === s && { color: "rgba(255,255,255,0.85)" }]}>
                {counts[s]} · EGP {Math.round(stageValue[s] / 1000)}k
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {leadsQ.isLoading ? (
        <ActivityIndicator color={colors.brand.trendyPink} style={{ marginTop: 24 }} size="large" />
      ) : (
        <FlatList
          data={currentLeads}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={leadsQ.isFetching}
              onRefresh={() => leadsQ.refetch()}
              tintColor={palette.text}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={48} color={palette.muted} />
              <Text style={styles.emptyText}>No leads in {STAGE_LABEL[stage]}</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(380)}>
              <Pressable
                style={styles.leadCard}
                onPress={() => router.push(`/crm/leads/${item.id}`)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsOf(item.contactName)}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.leadName} numberOfLines={1}>
                    {item.contactName}
                  </Text>
                  <Text style={styles.leadPhone} numberOfLines={1}>
                    {item.contactPhone ?? "No phone"}
                  </Text>
                  <View style={styles.leadFooter}>
                    {item.source ? (
                      <View style={styles.sourcePill}>
                        <Text style={styles.sourceText}>{item.source}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.leadAge}>{relativeTime(item.lastActivityAt)}</Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={styles.leadValue}>
                    EGP {Number(item.estimatedValue).toLocaleString()}
                  </Text>
                  {item.contactPhone ? (
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <Pressable
                        hitSlop={6}
                        onPress={() => {
                          const digits = item.contactPhone!.replace(/[^0-9]/g, "");
                          const text = encodeURIComponent(initialGreeting(item.contactName));
                          void Linking.openURL(`https://wa.me/${digits}?text=${text}`);
                        }}
                        style={[styles.callBtn, { backgroundColor: "#25D366" }]}
                      >
                        <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                      </Pressable>
                      <Pressable
                        hitSlop={6}
                        onPress={() => void Linking.openURL(`tel:${item.contactPhone}`)}
                        style={styles.callBtn}
                      >
                        <Ionicons name="call" size={14} color="#fff" />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },
    header: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingTop: 72,
      paddingHorizontal: 18,
      paddingBottom: 12,
      gap: 12,
    },
    kicker: { color: colors.brand.trendyPink, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
    title: {
      color: palette.text,
      fontSize: 26,
      fontFamily: "Anton",
      textTransform: "uppercase",
      letterSpacing: 0.3,
      marginTop: 4,
    },
    fab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.brand.trendyPink,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
    },
    fabText: { color: "#fff", fontWeight: "800", fontSize: 12 },
    heroCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: 14,
      backgroundColor: palette.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: palette.border,
    },
    heroLabel: { color: palette.muted, fontSize: 11, fontWeight: "700" },
    heroValue: {
      color: palette.text,
      fontSize: 20,
      fontWeight: "800",
      marginTop: 2,
      fontFamily: "Anton",
      letterSpacing: 0.4,
    },
    wonChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: (colors.brand.ecoLimelight ?? "#A9F453") + "22",
      marginTop: 4,
    },
    wonText: { color: colors.brand.ecoLimelight ?? "#A9F453", fontWeight: "800", fontSize: 13 },
    stageRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8, alignItems: "center" },
    stage: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
    },
    stageActive: {
      backgroundColor: colors.brand.trendyPink,
      borderColor: colors.brand.trendyPink,
    },
    stageLabel: { color: palette.muted, fontSize: 12, fontWeight: "800" },
    stageLabelActive: { color: "#fff" },
    stageMeta: { color: palette.muted, fontSize: 9, fontWeight: "700", marginTop: 1 },
    empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
    emptyText: { color: palette.muted, fontSize: 13 },
    leadCard: {
      flexDirection: "row",
      gap: 12,
      backgroundColor: palette.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 14,
      alignItems: "center",
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.brand.trendyPink + "33",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: colors.brand.trendyPink, fontWeight: "800", fontSize: 14 },
    leadName: { color: palette.text, fontSize: 15, fontWeight: "700" },
    leadPhone: { color: palette.muted, fontSize: 12 },
    leadFooter: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
    sourcePill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.brand.poolBlue + "22",
    },
    sourceText: {
      color: colors.brand.poolBlue,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    leadAge: { color: palette.muted, fontSize: 10 },
    leadValue: { color: colors.brand.trendyPink, fontWeight: "800", fontSize: 13 },
    callBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.brand.friendlyBlue,
      alignItems: "center",
      justifyContent: "center",
    },
    searchBar: {
      marginHorizontal: 14,
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 42,
    },
    searchInput: { flex: 1, color: palette.text, fontSize: 14, paddingVertical: 0 },
    filterRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, alignItems: "center" },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
    },
    filterChipActive: {
      backgroundColor: colors.brand.friendlyBlue,
      borderColor: colors.brand.friendlyBlue,
    },
    filterChipText: { color: palette.muted, fontWeight: "700", fontSize: 12 },
  });
}
