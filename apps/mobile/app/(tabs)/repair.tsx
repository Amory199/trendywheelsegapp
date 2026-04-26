import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { RepairRequest } from "@trendywheels/types";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { TWBadge, TWButton, TWCard, TWPressable, palette } from "../../components/ui";
import { api } from "../../lib/api";

const STATUS_ORDER = ["submitted", "assigned", "in-progress", "completed"] as const;
type RepairStatus = (typeof STATUS_ORDER)[number];

const STATUS_LABEL: Record<RepairStatus, string> = {
  submitted: "Requested",
  assigned: "Scheduled",
  "in-progress": "In progress",
  completed: "Completed",
};

const STATUS_TONE: Record<RepairStatus, "muted" | "blue" | "amber" | "lime"> = {
  submitted: "muted",
  assigned: "blue",
  "in-progress": "amber",
  completed: "lime",
};

function statusIndex(s: string): number {
  const i = STATUS_ORDER.indexOf(s as RepairStatus);
  return i === -1 ? 0 : i;
}

export default function RepairScreen(): React.JSX.Element {
  const router = useRouter();

  const q = useQuery({
    queryKey: ["repair-requests"],
    queryFn: () => api.getRepairRequests(),
  });

  const repairs = (q.data?.data ?? []) as RepairRequest[];

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 11, color: palette.muted, fontWeight: "700", letterSpacing: 0.8 }}>
            BOOK REPAIRS IN MINUTES
          </Text>
          <Text style={{ fontFamily: "Anton", fontSize: 30, color: palette.text, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 4 }}>
            My repairs
          </Text>
        </View>
        <TWButton kind="pink" size="sm" icon="add" onPress={() => router.push("/repair/request")}>
          New
        </TWButton>
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.brand.friendlyBlue} style={{ marginTop: 40 }} size="large" />
      ) : repairs.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: `${colors.brand.friendlyBlue}12`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="construct-outline" size={36} color={colors.brand.friendlyBlue} />
          </View>
          <Text style={{ fontFamily: "Anton", fontSize: 22, color: palette.text, textTransform: "uppercase", textAlign: "center", letterSpacing: 0.3 }}>
            No repairs yet
          </Text>
          <Text style={{ fontSize: 14, color: palette.muted, textAlign: "center", lineHeight: 20 }}>
            Certified mechanics come to you. Track every step in real-time.
          </Text>
          <TWButton kind="pink" size="lg" onPress={() => router.push("/repair/request")}>
            Book a repair
          </TWButton>
        </View>
      ) : (
        <FlatList<RepairRequest>
          data={repairs}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 120 }}
          renderItem={({ item, index }) => {
            const activeIdx = statusIndex(item.status);
            return (
              <Animated.View entering={FadeInDown.delay(index * 60).duration(420)}>
                <TWPressable onPress={() => router.push(`/repair/${item.id}`)}>
                  <TWCard>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: palette.text }} numberOfLines={1}>
                          {item.category}
                        </Text>
                        <Text style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <TWBadge tone={STATUS_TONE[item.status as RepairStatus] ?? "muted"}>
                        {STATUS_LABEL[item.status as RepairStatus] ?? item.status}
                      </TWBadge>
                    </View>

                    <Text style={{ fontSize: 13, color: palette.text, marginTop: 10, lineHeight: 18 }} numberOfLines={2}>
                      {item.description}
                    </Text>

                    {/* Timeline */}
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 4 }}>
                      {STATUS_ORDER.map((s, i) => {
                        const reached = i <= activeIdx;
                        const active = i === activeIdx && item.status !== "completed";
                        return (
                          <React.Fragment key={s}>
                            <View
                              style={{
                                width: active ? 14 : 10,
                                height: active ? 14 : 10,
                                borderRadius: 999,
                                backgroundColor: reached ? colors.brand.friendlyBlue : palette.faint,
                                borderWidth: active ? 3 : 0,
                                borderColor: `${colors.brand.trendyPink}66`,
                              }}
                            />
                            {i < STATUS_ORDER.length - 1 ? (
                              <View
                                style={{
                                  flex: 1,
                                  height: 2,
                                  backgroundColor: i < activeIdx ? colors.brand.friendlyBlue : palette.faint,
                                }}
                              />
                            ) : null}
                          </React.Fragment>
                        );
                      })}
                    </View>
                  </TWCard>
                </TWPressable>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}
