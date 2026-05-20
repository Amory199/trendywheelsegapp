import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { RepairRequest } from "@trendywheels/types";
import { colors, TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import * as React from "react";
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

const REPAIR_VIDEO = require("../../assets/category/repair.mp4");

const SCREEN_W = Dimensions.get("window").width;
const SERVICE_H_PADDING = 20;
const SERVICE_GAP = 12;
const SERVICE_TILE_W = (SCREEN_W - SERVICE_H_PADDING * 2 - SERVICE_GAP) / 2;

function RepairHero(): React.JSX.Element {
  const player = useVideoPlayer(REPAIR_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <View
      style={{
        height: 360,
        marginHorizontal: 20,
        marginBottom: 14,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        // TextureView clips inside RN tree — matches CategoryStrip fix; also
        // avoids the hero video showing "RENT" or other neighboring video text
        // bleeding through SurfaceView's out-of-tree compositing on Android.
        surfaceType="textureView"
      />
    </View>
  );
}

import { TWBadge, TWButton, TWCard, TWPressable, palette } from "../../components/ui";
import { api } from "../../lib/api";
import { useTabBarScrollHandler } from "../../lib/tab-bar-scroll";

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
  const scrollHandler = useTabBarScrollHandler();

  const q = useQuery({
    queryKey: ["repair-requests"],
    queryFn: () => api.getRepairRequests(),
  });

  const repairs = (q.data?.data ?? []) as RepairRequest[];

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text
            style={{ fontSize: 11, color: palette.muted, fontWeight: "700", letterSpacing: 0.8 }}
          >
            BOOK REPAIRS IN MINUTES
          </Text>
          <Text
            style={{
              fontFamily: "Anton",
              fontSize: 30,
              color: palette.text,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginTop: 4,
            }}
          >
            Service
          </Text>
        </View>
        <TWButton kind="pink" size="sm" icon="add" onPress={() => router.push("/repair/request")}>
          New
        </TWButton>
      </View>

      <RepairHero />

      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[
            { key: "repair", label: "Repair", icon: "construct", route: "/repair/request" },
            {
              key: "maintenance",
              label: "Maintenance",
              icon: "build",
              route: "/service/maintenance",
            },
            {
              key: "pickup",
              label: "Pickup & Delivery",
              icon: "cube",
              route: "/service/pickup-delivery",
            },
            {
              key: "customize",
              label: "Customization",
              icon: "color-palette",
              route: "/service/customization",
            },
          ].map((s) => (
            <TWPressable
              key={s.key}
              onPress={() => router.push(s.route as never)}
              style={{
                width: SERVICE_TILE_W,
                minHeight: 110,
                padding: 14,
                borderRadius: 16,
                backgroundColor: colors.dark.card,
                borderWidth: 1,
                borderColor: colors.dark.border,
                justifyContent: "space-between",
              }}
            >
              <Ionicons
                name={s.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={colors.brand.poolBlue}
              />
              <Text
                style={{ color: palette.text, fontSize: 14, fontWeight: "700" }}
                numberOfLines={1}
              >
                {s.label}
              </Text>
            </TWPressable>
          ))}
        </View>
        <Text
          style={{
            color: palette.muted,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginTop: 18,
          }}
        >
          My repairs
        </Text>
      </View>

      {q.isLoading ? (
        <ActivityIndicator
          color={colors.brand.friendlyBlue}
          style={{ marginTop: 40 }}
          size="large"
        />
      ) : repairs.length === 0 ? (
        // Empty state: ditched the flex:1 + justify:center math because the
        // header + hero + tile grid already eat ~600px on most phones, so the
        // remaining "flex" was smaller than the empty-state content height,
        // pushing the bottom of the empty state behind the tab bar. Stack it
        // naturally and give it real bottom padding instead.
        <View
          style={{
            alignItems: "center",
            gap: 16,
            paddingTop: 40,
            paddingHorizontal: 40,
            paddingBottom: TAB_BAR_SAFE_BOTTOM,
          }}
        >
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
          <Text
            style={{
              fontFamily: "Anton",
              fontSize: 22,
              color: palette.text,
              textTransform: "uppercase",
              textAlign: "center",
              letterSpacing: 0.3,
            }}
          >
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
        <Animated.FlatList<RepairRequest>
          data={repairs}
          keyExtractor={(r) => r.id}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: TAB_BAR_SAFE_BOTTOM }}
          renderItem={({ item, index }) => {
            const activeIdx = statusIndex(item.status);
            return (
              <Animated.View entering={FadeInDown.delay(index * 60).duration(420)}>
                <TWPressable onPress={() => router.push(`/repair/${item.id}`)}>
                  <TWCard>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontSize: 15, fontWeight: "700", color: palette.text }}
                          numberOfLines={1}
                        >
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

                    <Text
                      style={{ fontSize: 13, color: palette.text, marginTop: 10, lineHeight: 18 }}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>

                    {/* Timeline */}
                    <View
                      style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 4 }}
                    >
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
                                backgroundColor: reached
                                  ? colors.brand.friendlyBlue
                                  : palette.faint,
                                borderWidth: active ? 3 : 0,
                                borderColor: `${colors.brand.trendyPink}66`,
                              }}
                            />
                            {i < STATUS_ORDER.length - 1 ? (
                              <View
                                style={{
                                  flex: 1,
                                  height: 2,
                                  backgroundColor:
                                    i < activeIdx ? colors.brand.friendlyBlue : palette.faint,
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
