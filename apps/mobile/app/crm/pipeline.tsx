import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
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
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

interface Lead {
  id: string;
  contactName: string;
  contactPhone?: string;
  status: string;
  estimatedValue: number | string;
  source?: string;
  lastActivityAt?: string;
}

const STAGES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const STAGE_ICON: Record<Stage, keyof typeof Ionicons.glyphMap> = {
  new: "sparkles-outline",
  contacted: "call-outline",
  qualified: "checkmark-circle-outline",
  proposal: "document-text-outline",
  won: "trophy-outline",
  lost: "close-circle-outline",
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

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CrmPipeline(): React.JSX.Element {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [stage, setStage] = useState<Stage>("new");

  const pipelineQ = useQuery({
    queryKey: ["crm", "pipeline"],
    queryFn: async () => {
      const r = await api.crmPipeline();
      return r.data as Record<Stage, Lead[]>;
    },
  });

  const counts = useMemo<Record<Stage, number>>(() => {
    const d = pipelineQ.data ?? ({} as Record<Stage, Lead[]>);
    return STAGES.reduce(
      (acc, s) => {
        acc[s] = d[s]?.length ?? 0;
        return acc;
      },
      {} as Record<Stage, number>,
    );
  }, [pipelineQ.data]);

  const stageValue = useMemo<Record<Stage, number>>(() => {
    const d = pipelineQ.data ?? ({} as Record<Stage, Lead[]>);
    return STAGES.reduce(
      (acc, s) => {
        acc[s] = (d[s] ?? []).reduce((sum, l) => sum + Number(l.estimatedValue ?? 0), 0);
        return acc;
      },
      {} as Record<Stage, number>,
    );
  }, [pipelineQ.data]);

  const totalValue = Object.values(stageValue).reduce((a, b) => a + b, 0);
  const currentLeads = (pipelineQ.data?.[stage] ?? []) as Lead[];

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
      </View>

      <View style={styles.heroCard}>
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
            <Ionicons
              name={STAGE_ICON[s]}
              size={14}
              color={stage === s ? "#fff" : colors.text.secondary}
            />
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

      {pipelineQ.isLoading ? (
        <ActivityIndicator color={colors.brand.trendyPink} style={{ marginTop: 24 }} size="large" />
      ) : (
        <FlatList
          data={currentLeads}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={pipelineQ.isFetching}
              onRefresh={() => pipelineQ.refetch()}
              tintColor={colors.text.light}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={48} color={colors.text.secondary} />
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
                    <Pressable
                      hitSlop={8}
                      onPress={() => void Linking.openURL(`tel:${item.contactPhone}`)}
                      style={styles.callBtn}
                    >
                      <Ionicons name="call" size={14} color="#fff" />
                    </Pressable>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 12,
  },
  kicker: { color: colors.brand.trendyPink, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: {
    color: colors.text.light,
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
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  heroLabel: { color: colors.text.secondary, fontSize: 11, fontWeight: "700" },
  heroValue: {
    color: colors.text.light,
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
  stageRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  stage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  stageActive: {
    backgroundColor: colors.brand.trendyPink,
    borderColor: colors.brand.trendyPink,
  },
  stageLabel: { color: colors.text.secondary, fontSize: 12, fontWeight: "800" },
  stageLabelActive: { color: "#fff" },
  stageMeta: { color: colors.text.secondary, fontSize: 9, fontWeight: "700", marginTop: 1 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  leadCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
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
  leadName: { color: colors.text.light, fontSize: 15, fontWeight: "700" },
  leadPhone: { color: colors.text.secondary, fontSize: 12 },
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
  leadAge: { color: colors.text.secondary, fontSize: 10 },
  leadValue: { color: colors.brand.trendyPink, fontWeight: "800", fontSize: 13 },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.friendlyBlue,
    alignItems: "center",
    justifyContent: "center",
  },
});
