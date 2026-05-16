import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

export default function CrmPipeline(): JSX.Element {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
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

  const totalValue = useMemo(() => {
    if (!pipelineQ.data) return 0;
    return Object.values(pipelineQ.data)
      .flat()
      .reduce((sum, l) => sum + Number(l.estimatedValue ?? 0), 0);
  }, [pipelineQ.data]);

  const currentLeads = (pipelineQ.data?.[stage] ?? []) as Lead[];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hi, {user?.name?.split(" ")[0] ?? "Sales"}</Text>
          <Text style={styles.role}>SALES · PIPELINE</Text>
        </View>
        <Pressable hitSlop={12} onPress={() => void logout()}>
          <Ionicons name="log-out-outline" size={22} color={colors.text.light} />
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>Pipeline value</Text>
          <Text style={styles.summaryValue}>EGP {Math.round(totalValue).toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.summaryLabel}>Won this month</Text>
          <Text style={[styles.summaryValue, { color: colors.brand.ecoLimelight ?? "#A9F453" }]}>
            {counts.won}
          </Text>
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
            <Text style={[styles.stageLabel, stage === s && styles.stageLabelActive]}>
              {STAGE_LABEL[s]}
            </Text>
            <Text style={[styles.stageCount, stage === s && styles.stageCountActive]}>
              {counts[s]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {pipelineQ.isLoading ? (
        <ActivityIndicator color={colors.brand.trendyPink} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={currentLeads}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 8 }}
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
          renderItem={({ item }) => (
            <Pressable style={styles.leadCard} onPress={() => router.push(`/crm/leads/${item.id}`)}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.leadName}>{item.contactName}</Text>
                <Text style={styles.leadPhone}>{item.contactPhone ?? "No phone"}</Text>
                <Text style={styles.leadSource}>Source: {item.source ?? "—"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.leadValue}>
                  EGP {Number(item.estimatedValue).toLocaleString()}
                </Text>
                {item.lastActivityAt && (
                  <Text style={styles.leadActivity}>
                    {new Date(item.lastActivityAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </Pressable>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  hello: { color: colors.text.light, fontSize: 20, fontWeight: "700" },
  role: { color: colors.brand.trendyPink, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 14,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  summaryLabel: { color: colors.text.secondary, fontSize: 11, fontWeight: "600" },
  summaryValue: { color: colors.text.light, fontSize: 18, fontWeight: "800", marginTop: 2 },
  stageRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  stage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  stageActive: {
    backgroundColor: colors.brand.trendyPink,
    borderColor: colors.brand.trendyPink,
  },
  stageLabel: { color: colors.text.secondary, fontSize: 12, fontWeight: "700" },
  stageLabelActive: { color: "#fff" },
  stageCount: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: colors.dark.bg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  stageCountActive: { color: "#fff", backgroundColor: "rgba(0,0,0,0.3)" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  leadCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
  },
  leadName: { color: colors.text.light, fontSize: 15, fontWeight: "700" },
  leadPhone: { color: colors.text.secondary, fontSize: 12 },
  leadSource: { color: colors.text.secondary, fontSize: 11 },
  leadValue: { color: colors.brand.trendyPink, fontWeight: "700" },
  leadActivity: { color: colors.text.secondary, fontSize: 10, marginTop: 4 },
});
