import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
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
import { useDisplay, useTracking } from "../../../lib/typography";

type Kind = "maintenance" | "customization" | "transport";

interface ServiceRow {
  id: string;
  status: string;
  createdAt: string;
  serviceType?: string;
  kind?: string;
  fromAddress?: string;
  toAddress?: string;
  user?: { name?: string; phone?: string };
}

const KINDS: {
  key: Kind;
  labelKey:
    | "admin.serviceKindMaintenance"
    | "admin.serviceKindCustomization"
    | "admin.serviceKindTransport";
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}[] = [
  { key: "maintenance", labelKey: "admin.serviceKindMaintenance", icon: "build", tint: "#F5B800" },
  {
    key: "customization",
    labelKey: "admin.serviceKindCustomization",
    icon: "color-palette",
    tint: colors.brand.trendyPink,
  },
  {
    key: "transport",
    labelKey: "admin.serviceKindTransport",
    icon: "cube",
    tint: colors.brand.poolBlue,
  },
];

export default function AdminServiceRequests(): React.JSX.Element {
  const router = useRouter();
  const t = useT();
  const display = useDisplay();
  const track = useTracking();
  const [kind, setKind] = useState<Kind>("maintenance");

  const q = useQuery({
    queryKey: ["admin", "service", kind],
    queryFn: async (): Promise<ServiceRow[]> => {
      const r =
        kind === "maintenance"
          ? await api.adminListMaintenance()
          : kind === "customization"
            ? await api.adminListCustomization()
            : await api.adminListTransport();
      return ((r as { data?: ServiceRow[] }).data ?? []) as ServiceRow[];
    },
  });

  const activeKind = KINDS.find((k) => k.key === kind)!;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <BackButton style={{ marginLeft: -8, marginBottom: 6 }} fallback="/admin/dashboard" />
        <Text style={[styles.kicker, { letterSpacing: track(1.5) }]}>
          {t("admin.serviceKicker")}
        </Text>
        <Text style={[styles.title, display(0.3)]}>{t("admin.serviceTitle")}</Text>
      </View>

      <View style={styles.filterRow}>
        {KINDS.map((k) => (
          <Pressable
            key={k.key}
            onPress={() => setKind(k.key)}
            style={[
              styles.filter,
              kind === k.key && { backgroundColor: k.tint, borderColor: k.tint },
            ]}
          >
            <Ionicons name={k.icon} size={14} color={kind === k.key ? "#fff" : k.tint} />
            <Text style={[styles.filterText, kind === k.key && { color: "#fff" }]}>
              {t(k.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={activeKind.tint} style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList<ServiceRow>
          data={q.data ?? []}
          keyExtractor={(r) => r.id}
          removeClippedSubviews
          windowSize={7}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching}
              onRefresh={() => q.refetch()}
              tintColor={colors.text.light}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name={activeKind.icon} size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>
                {t("admin.serviceEmptyPrefix")}
                {t(activeKind.labelKey)}
                {t("admin.serviceEmptySuffix")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/admin/service-requests/${kind}/${item.id}`)}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.tt} numberOfLines={1}>
                  {item.serviceType ??
                    item.kind ??
                    (item.fromAddress
                      ? t("admin.serviceTransportFallback")
                      : t("admin.serviceRequestFallback"))}
                </Text>
                {item.fromAddress ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.fromAddress?.slice(0, 30)} → {item.toAddress?.slice(0, 30)}
                  </Text>
                ) : null}
                <Text style={styles.meta}>
                  {item.user?.name ?? t("admin.serviceCustomerFallback")} ·{" "}
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.statusChip, { borderColor: activeKind.tint + "55" }]}>
                <Text style={[styles.statusText, { color: activeKind.tint }]}>{item.status}</Text>
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
  header: { paddingTop: 72, paddingHorizontal: 18, paddingBottom: 14 },
  kicker: { color: colors.brand.poolBlue, fontSize: 11, fontWeight: "800" },
  title: {
    color: colors.text.light,
    fontSize: 28,
    textTransform: "uppercase",
    marginTop: 4,
  },
  filterRow: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 10, gap: 6 },
  filter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  filterText: { color: colors.text.secondary, fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
  },
  tt: { color: colors.text.light, fontSize: 14, fontWeight: "700", textTransform: "capitalize" },
  meta: { color: colors.text.secondary, fontSize: 11 },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
});
