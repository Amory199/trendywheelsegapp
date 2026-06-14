// Referral card — gradient (pink → blue), 6-char code, share button, joined/
// completed counters. Calls /api/referrals/me directly via the api client.
// Returns null while loading so the rest of the feed doesn't shift around.

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import { Share, Text, View } from "react-native";

import { api } from "../../lib/api";
import { useT } from "../../lib/locale";
import { useDisplay, useTracking } from "../../lib/typography";
import { TWPressable } from "../ui";

interface Referral {
  completedAt: string | null;
}
interface ReferralData {
  code: string;
  usedCount: number;
  referrals: Referral[];
}

export function ReferralCard(): React.JSX.Element | null {
  const t = useT();
  const display = useDisplay();
  const track = useTracking();
  const q = useQuery<{ data: ReferralData }>({
    queryKey: ["mobile-referral"],
    queryFn: () => api.getReferralsMe(),
  });
  const data = q.data?.data;
  if (!data) return null;
  const completed = data.referrals.filter((r) => r.completedAt).length;

  const onShare = async (): Promise<void> => {
    try {
      await Share.share({
        message: t("profile.referral.shareMessage").replace("{code}", data.code),
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={[colors.brand.trendyPink, colors.brand.friendlyBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 18, flexDirection: "row", alignItems: "flex-start", gap: 14 }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "800",
              color: "rgba(255,255,255,0.85)",
              letterSpacing: track(1.2),
            }}
          >
            {t("profile.referral.codeLabel")}
          </Text>
          <Text
            style={[
              {
                fontSize: 30,
                color: "#fff",
                marginTop: 4,
              },
              display(1),
            ]}
          >
            {data.code}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.85)",
              marginTop: 6,
              lineHeight: 15,
            }}
          >
            {t("profile.referral.blurb")}
          </Text>
          <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: "#fff" }}>
              <Text style={{ fontWeight: "800" }}>{data.usedCount}</Text>{" "}
              {t("profile.referral.joined")}
            </Text>
            <Text style={{ fontSize: 11, color: "#fff" }}>
              <Text style={{ fontWeight: "800" }}>{completed}</Text>{" "}
              {t("profile.referral.completed")}
            </Text>
          </View>
        </View>
        <TWPressable
          onPress={onShare}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: "rgba(255,255,255,0.18)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.35)",
          }}
        >
          <Text
            style={{ color: "#fff", fontSize: 12, fontWeight: "700", letterSpacing: track(0.5) }}
          >
            {t("profile.referral.share")}
          </Text>
        </TWPressable>
      </LinearGradient>
    </View>
  );
}
