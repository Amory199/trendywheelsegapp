import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, type Palette } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BackButton } from "../../../components/BackButton";
import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";
import { useTheme } from "../../../lib/use-theme";

interface InactiveLead {
  id: string;
  contactName: string;
  contactPhone?: string | null;
  reassignmentCount: number;
  updatedAt: string;
  notes?: string | null;
}

// Admin-only view of leads that the rotation system exhausted (5 sales agents
// tried, nobody could progress). Hidden from sales-pipeline; admin decides to
// retry, archive, or contact the customer directly.
export default function AdminInactiveLeads(): React.JSX.Element {
  const router = useRouter();
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const t = useT();

  const q = useQuery({
    queryKey: ["admin", "leads", "inactive"],
    queryFn: async (): Promise<InactiveLead[]> => {
      const r = await api.crmLeads({ status: "inactive" });
      return (r.data as InactiveLead[]) ?? [];
    },
    // 5s stale so admin sees rotation parks land quickly even without a WS
    // event. The realtime client invalidates this query on `lead.inactive`.
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <BackButton style={{ marginLeft: -8, marginBottom: 6 }} fallback="/admin/dashboard" />
        <Text style={styles.kicker}>{t("admin.inactiveKicker")}</Text>
        <Text style={styles.title}>{t("admin.inactiveTitle")}</Text>
        <Text style={styles.sub}>{t("admin.inactiveSubtitle")}</Text>
      </View>

      {q.isLoading ? (
        <ActivityIndicator
          color={colors.brand.friendlyBlue}
          style={{ marginTop: 40 }}
          size="large"
        />
      ) : (
        <FlatList<InactiveLead>
          data={q.data ?? []}
          keyExtractor={(l) => l.id}
          removeClippedSubviews
          windowSize={7}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching}
              onRefresh={() => q.refetch()}
              tintColor={palette.text}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="moon-outline" size={48} color={palette.muted} />
              <Text style={styles.emptyText}>{t("admin.inactiveEmptyTitle")}</Text>
              <Text style={styles.emptyHint}>{t("admin.inactiveEmptyHint")}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              // Stay inside the admin Tabs scope — the /crm/leads/:id path
              // belongs to the sales CRM layout, which drops the admin tab bar
              // and traps admin in a screen they can only leave by logging out.
              onPress={() => router.push(`/admin/leads/${item.id}`)}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.contactName}
                </Text>
                {item.contactPhone ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.contactPhone}
                  </Text>
                ) : null}
                <Text style={styles.meta}>
                  {item.reassignmentCount}
                  {t("admin.inactiveRotatedSuffix")}
                  {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },
    header: { paddingTop: 72, paddingHorizontal: 18, paddingBottom: 8 },
    kicker: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
    },
    title: { color: palette.text, fontSize: 24, fontWeight: "700", marginTop: 4 },
    sub: { color: palette.muted, fontSize: 12, marginTop: 6, lineHeight: 16 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: palette.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 14,
    },
    name: { color: palette.text, fontSize: 15, fontWeight: "700" },
    meta: { color: palette.muted, fontSize: 12 },
    empty: { alignItems: "center", paddingVertical: 60, gap: 10, paddingHorizontal: 30 },
    emptyText: { color: palette.text, fontSize: 14, fontWeight: "700" },
    emptyHint: {
      color: palette.muted,
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
    },
  });
}
