import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { RepairRequest } from "@trendywheels/types";
import { colors, TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import * as React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

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
        height: 220,
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

import { TWBadge, TWButton, TWCard, TWPressable, TWSkeletonCard } from "../../components/ui";
import { api } from "../../lib/api";
import { useT } from "../../lib/locale";
import { useTabBarScrollHandler } from "../../lib/tab-bar-scroll";
import { useTheme } from "../../lib/use-theme";

const REPAIR_VIDEO = require("../../assets/category/repair.mp4");

const STATUS_ORDER = ["submitted", "assigned", "in-progress", "completed"] as const;
type RepairStatus = (typeof STATUS_ORDER)[number];

const STATUS_LABEL_KEY: Record<RepairStatus, string> = {
  submitted: "service.status.submitted",
  assigned: "service.status.assigned",
  "in-progress": "service.status.inProgress",
  completed: "service.status.completed",
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
  const { palette } = useTheme();
  const t = useT();

  const q = useQuery({
    queryKey: ["repair-requests"],
    queryFn: () => api.getRepairRequests(),
  });

  const repairs = (q.data?.data ?? []) as RepairRequest[];

  // Header section moves into ListHeaderComponent so the FlatList becomes the
  // single scrolling surface. The previous layout stacked header + hero + tile
  // grid + FlatList as flex children of the root View, leaving the FlatList
  // with zero remaining height → unscrollable and repairs invisible.
  const ListHeader = (
    <View>
      <View
        style={{
          paddingTop: 56,
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
            {t("service.tab.eyebrow")}
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
            {t("service.tab.title")}
          </Text>
        </View>
        <TWButton kind="pink" size="sm" icon="add" onPress={() => router.push("/repair/request")}>
          {t("service.tab.new")}
        </TWButton>
      </View>

      <RepairHero />

      {/* No horizontal padding here — the FlatList's contentContainerStyle
          (paddingHorizontal: 20) already supplies it. Doubling caused the
          2-up SERVICE_TILE_W grid to overflow and wrap to single-column. */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[
            {
              key: "repair",
              labelKey: "service.tab.tileRepair",
              icon: "construct",
              route: "/repair/request",
            },
            {
              key: "maintenance",
              labelKey: "service.tab.tileMaintenance",
              icon: "build",
              route: "/service/maintenance",
            },
            {
              key: "pickup",
              labelKey: "service.tab.tilePickup",
              icon: "cube",
              route: "/service/pickup-delivery",
            },
            {
              key: "customize",
              labelKey: "service.tab.tileCustomize",
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
                backgroundColor: palette.card,
                borderWidth: 1,
                borderColor: palette.border,
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
                {t(s.labelKey)}
              </Text>
            </TWPressable>
          ))}
        </View>
        {repairs.length > 0 ? (
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
            {t("service.tab.myRepairs")}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const ListEmpty = q.isLoading ? (
    // Skeleton row stack — telegraphs the upcoming list shape so the user
    // feels "almost there" instead of "stuck on spinner".
    <View style={{ gap: 14 }}>
      <TWSkeletonCard height={120} />
      <TWSkeletonCard height={120} />
      <TWSkeletonCard height={120} />
    </View>
  ) : (
    <View
      style={{
        alignItems: "center",
        gap: 16,
        paddingTop: 40,
        paddingHorizontal: 40,
        paddingBottom: 40,
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
        {t("service.tab.emptyTitle")}
      </Text>
      <Text style={{ fontSize: 14, color: palette.muted, textAlign: "center", lineHeight: 20 }}>
        {t("service.tab.emptyBody")}
      </Text>
      <TWButton kind="pink" size="lg" onPress={() => router.push("/repair/request")}>
        {t("service.tab.bookRepair")}
      </TWButton>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <Animated.FlatList<RepairRequest>
        data={repairs}
        keyExtractor={(r) => r.id}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        removeClippedSubviews
        windowSize={7}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 14,
          paddingBottom: TAB_BAR_SAFE_BOTTOM,
        }}
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
                      {STATUS_LABEL_KEY[item.status as RepairStatus]
                        ? t(STATUS_LABEL_KEY[item.status as RepairStatus])
                        : item.status}
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
    </View>
  );
}
