// Customer-side tracking for the three fire-and-forget service forms
// (maintenance, customization, pickup & delivery). One merged list backed by
// GET /api/service/mine so a submitted request is never a black hole again.

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, type Palette } from "@trendywheels/ui-tokens";
import { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "../../components/BackButton";
import { GuestGate } from "../../components/GuestGate";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { useDisplay, useTracking } from "../../lib/typography";
import { useTheme } from "../../lib/use-theme";

interface MyServiceRequest {
  id: string;
  kind: "maintenance" | "customization" | "transport";
  status: string;
  createdAt: string;
  summary: string;
}

const KIND_ICON: Record<MyServiceRequest["kind"], React.ComponentProps<typeof Ionicons>["name"]> = {
  maintenance: "build-outline",
  customization: "color-palette-outline",
  transport: "car-outline",
};

const KIND_LABEL_KEY: Record<MyServiceRequest["kind"], string> = {
  maintenance: "service.myRequests.kindMaintenance",
  customization: "service.myRequests.kindCustomization",
  transport: "service.myRequests.kindTransport",
};

// Same 5-state lifecycle as repairs — reuse the repair-detail status labels.
const STATUS_LABEL_KEY: Record<string, string> = {
  submitted: "service.detail.statusSubmitted",
  assigned: "service.detail.statusAssigned",
  "in-progress": "service.detail.statusInProgress",
  completed: "service.detail.statusCompleted",
  cancelled: "service.detail.statusCancelled",
};

const STATUS_COLOR: Record<string, string> = {
  submitted: "#FF7A00",
  assigned: colors.brand.friendlyBlue,
  "in-progress": colors.brand.poolBlue,
  completed: "#3ECF6A",
  cancelled: colors.error,
};

export default function MyServiceRequestsScreen(): JSX.Element {
  const insets = useSafeAreaInsets();
  const t = useT();
  const display = useDisplay();
  const track = useTracking();
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const user = useAuth((s) => s.user);

  const listQ = useQuery({
    queryKey: ["service", "mine"],
    queryFn: async (): Promise<MyServiceRequest[]> => {
      const r = await api.request<{ data: MyServiceRequest[] }>("GET", "/api/service/mine");
      return r.data ?? [];
    },
    enabled: !!user,
  });

  // Tracking a request is account-bound — wall guests here, nicely.
  if (!user) return <GuestGate />;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <BackButton
          style={{ marginLeft: -8, marginBottom: 6 }}
          color={palette.text}
          fallback="/(tabs)/repair"
        />
        <Text style={[styles.kicker, { letterSpacing: track(1.5) }]}>
          {t("service.myRequests.kicker")}
        </Text>
        <Text style={[styles.title, display(0.3)]}>{t("service.myRequests.title")}</Text>
      </View>

      <FlatList
        data={listQ.data ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={listQ.isFetching}
            onRefresh={() => listQ.refetch()}
            tintColor={palette.text}
          />
        }
        ListEmptyComponent={
          listQ.isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="file-tray-outline" size={48} color={palette.muted} />
              <Text style={styles.emptyTitle}>{t("service.myRequests.emptyTitle")}</Text>
              <Text style={styles.emptyBody}>{t("service.myRequests.emptyBody")}</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.kindIcon}>
              <Ionicons
                name={KIND_ICON[item.kind] ?? "construct-outline"}
                size={20}
                color={colors.brand.friendlyBlue}
              />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.summary} numberOfLines={1}>
                {item.summary}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {KIND_LABEL_KEY[item.kind] ? t(KIND_LABEL_KEY[item.kind]) : item.kind}
              </Text>
              <Text style={styles.age}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            <View
              style={[
                styles.statusChip,
                { borderColor: STATUS_COLOR[item.status] ?? palette.border },
              ]}
            >
              <Text
                style={[
                  styles.statusChipText,
                  { color: STATUS_COLOR[item.status] ?? palette.muted },
                ]}
              >
                {STATUS_LABEL_KEY[item.status] ? t(STATUS_LABEL_KEY[item.status]) : item.status}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },
    header: { paddingHorizontal: 18, paddingBottom: 14 },
    kicker: { color: colors.brand.poolBlue, fontSize: 11, fontWeight: "800" },
    title: {
      color: palette.text,
      fontSize: 28,
      textTransform: "uppercase",
      marginTop: 4,
    },
    empty: { alignItems: "center", paddingVertical: 60, gap: 10, paddingHorizontal: 30 },
    emptyTitle: { color: palette.text, fontSize: 15, fontWeight: "700" },
    emptyBody: { color: palette.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: palette.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 12,
    },
    kindIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.brand.friendlyBlue}18`,
      alignItems: "center",
      justifyContent: "center",
    },
    summary: { color: palette.text, fontSize: 14, fontWeight: "700" },
    meta: { color: palette.muted, fontSize: 11 },
    age: { color: palette.muted, fontSize: 10 },
    statusChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusChipText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  });
}
