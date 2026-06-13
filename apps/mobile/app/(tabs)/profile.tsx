// Customer profile — dashboard-style vertical feed. Replaces the previous
// hero+grid layout (TRACK AR) whose 47%-width activity tiles auto-shrunk
// labels via adjustsFontSizeToFit. Now every card is full-width with ≥16px
// labels — no more squished "My Bookings" text.
//
// Composition only — every visual block is in components/profile/. Data fetches
// (bookings/listings/repairs/referrals) hit endpoints that already exist; no
// backend change needed for this redesign.

import { useQuery } from "@tanstack/react-query";
import type { LoyaltyTier } from "@trendywheels/types";
import { TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as React from "react";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ActivityCard } from "../../components/profile/ActivityCard";
import { HeroStrip } from "../../components/profile/HeroStrip";
import { KpiRow } from "../../components/profile/KpiRow";
import { LoyaltyCard } from "../../components/profile/LoyaltyCard";
import { ReferralCard } from "../../components/profile/ReferralCard";
import { SettingsList } from "../../components/profile/SettingsList";
import { TWButton } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { useTabBarScrollHandler } from "../../lib/tab-bar-scroll";
import { useTheme } from "../../lib/use-theme";

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const t = useT();
  const { palette } = useTheme();
  const { user, hydrate, logout, initialized } = useAuth();
  const scrollHandler = useTabBarScrollHandler();

  useEffect(() => {
    if (!initialized) void hydrate();
  }, [initialized, hydrate]);

  const onLogout = async (): Promise<void> => {
    await logout();
    router.replace("/(auth)/phone");
  };

  // Background queries for the activity cards. Stale-while-revalidate keeps
  // the latest counts/preview rows fresh whenever the user pulls the tab.
  const bookingsQ = useQuery({
    queryKey: ["profile-bookings"],
    queryFn: () => api.getBookings({ mine: true, limit: 1 } as never),
    enabled: !!user,
  });
  const listingsQ = useQuery({
    queryKey: ["profile-listings", user?.id],
    queryFn: () => api.getSalesListings({ userId: user?.id, limit: 1 } as never),
    enabled: !!user,
  });
  const repairsQ = useQuery({
    queryKey: ["profile-repairs"],
    queryFn: () => api.getRepairRequests({ mine: true, limit: 1 } as never),
    enabled: !!user,
  });
  const rentalsQ = useQuery({
    queryKey: ["profile-rental-listings"],
    queryFn: () => api.getRentalListings(),
    enabled: !!user,
  });
  const unreadQ = useQuery({
    queryKey: ["profile-unread"],
    queryFn: () => api.getUnreadMessageCount().catch(() => ({ count: 0 })),
    enabled: !!user,
  });
  const ordersQ = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.getMyOrders().catch(() => ({ data: [] })),
    enabled: !!user,
  });

  // Signed-out fallback.
  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.bg,
          paddingTop: 80,
          paddingHorizontal: 24,
          alignItems: "center",
        }}
      >
        <Text style={{ color: palette.muted, fontSize: 16, marginBottom: 20 }}>
          {t("profile.notSignedIn")}
        </Text>
        <TWButton kind="pink" size="lg" onPress={() => router.replace("/(auth)/phone")}>
          {t("profile.signIn")}
        </TWButton>
      </View>
    );
  }

  const tier = (user.loyaltyTier ?? "bronze") as LoyaltyTier;
  const points = user.loyaltyPoints ?? 0;
  const bookingsCount =
    (bookingsQ.data as { total?: number; data?: unknown[] } | undefined)?.total ??
    (bookingsQ.data as { data?: unknown[] } | undefined)?.data?.length ??
    0;
  const listingsCount =
    (listingsQ.data as { total?: number; data?: unknown[] } | undefined)?.total ??
    (listingsQ.data as { data?: unknown[] } | undefined)?.data?.length ??
    0;
  const repairsCount =
    (repairsQ.data as { total?: number; data?: unknown[] } | undefined)?.total ??
    (repairsQ.data as { data?: unknown[] } | undefined)?.data?.length ??
    0;
  const rentalsCount =
    (rentalsQ.data as { total?: number; data?: unknown[] } | undefined)?.total ??
    (rentalsQ.data as { data?: unknown[] } | undefined)?.data?.length ??
    0;
  const unreadCount = unreadQ.data?.count ?? 0;
  const ordersCount = (ordersQ.data as { data?: unknown[] } | undefined)?.data?.length ?? 0;

  const latestBooking = (bookingsQ.data as { data?: Array<{ status?: string }> } | undefined)
    ?.data?.[0];
  const latestOrder = (ordersQ.data as { data?: Array<{ status?: string }> } | undefined)
    ?.data?.[0];
  const latestRepair = (repairsQ.data as { data?: Array<{ status?: string }> } | undefined)
    ?.data?.[0];
  const latestListing = (listingsQ.data as { data?: Array<{ title?: string }> } | undefined)
    ?.data?.[0];
  const latestRental = (rentalsQ.data as { data?: Array<{ status?: string }> } | undefined)
    ?.data?.[0];

  const appVersion =
    (Constants?.expoConfig?.version as string | undefined) ??
    Constants?.nativeAppVersion ??
    "1.0.0";

  return (
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: TAB_BAR_SAFE_BOTTOM }}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
    >
      <Animated.View entering={FadeInDown.duration(360)}>
        <HeroStrip name={user.name ?? t("profile.welcome")} phone={user.phone} tier={tier} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(380).delay(60)}>
        <KpiRow
          stats={[
            { value: points.toLocaleString(), label: t("profile.kpiPoints") },
            { value: bookingsCount, label: t("profile.kpiBookings") },
            { value: listingsCount, label: t("profile.kpiListings") },
          ]}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(120)}>
        <LoyaltyCard tier={tier} points={points} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(420).delay(180)}>
        <ActivityCard
          icon="calendar-outline"
          title={t("profile.activity.bookingsTitle")}
          subtitle={
            bookingsCount === 0
              ? t("profile.activity.bookingsEmpty")
              : latestBooking?.status
                ? `${bookingsCount} ${t("profile.activity.total")} · ${t("profile.activity.latest")}: ${latestBooking.status}`
                : `${bookingsCount} ${t("profile.activity.total")}`
          }
          tone="blue"
          onPress={() => router.push("/rent/my-bookings")}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(430).delay(210)}>
        <ActivityCard
          icon="bag-outline"
          title={t("profile.activity.ordersTitle")}
          subtitle={
            ordersCount === 0
              ? t("profile.activity.ordersEmpty")
              : latestOrder?.status
                ? `${ordersCount} ${t("profile.activity.total")} · ${t("profile.activity.latest")}: ${latestOrder.status}`
                : `${ordersCount} ${t("profile.activity.total")}`
          }
          tone="pink"
          onPress={() => router.push("/buy/my-orders")}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(435).delay(225)}>
        <ActivityCard
          icon="heart-outline"
          title={t("profile.activity.savedTitle")}
          subtitle={t("profile.activity.savedSubtitle")}
          tone="pink"
          onPress={() => router.push("/profile/favorites")}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(440).delay(240)}>
        <ActivityCard
          icon="pricetag-outline"
          title={t("profile.activity.listingsTitle")}
          subtitle={
            listingsCount === 0
              ? t("profile.activity.listingsEmpty")
              : latestListing?.title
                ? `${listingsCount} ${t("profile.activity.total")} · ${latestListing.title}`
                : `${listingsCount} ${t("profile.activity.total")}`
          }
          tone="pink"
          onPress={() => router.push("/sell/my-listings")}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(460).delay(300)}>
        <ActivityCard
          icon="construct-outline"
          title={t("profile.activity.repairsTitle")}
          subtitle={
            repairsCount === 0
              ? t("profile.activity.repairsEmpty")
              : latestRepair?.status
                ? `${repairsCount} ${t("profile.activity.total")} · ${t("profile.activity.latest")}: ${latestRepair.status}`
                : `${repairsCount} ${t("profile.activity.total")}`
          }
          tone="amber"
          onPress={() => router.push("/(tabs)/repair")}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(470).delay(330)}>
        <ActivityCard
          icon="car-sport-outline"
          title={t("profile.activity.rentalsTitle")}
          subtitle={
            rentalsCount === 0
              ? t("profile.activity.rentalsEmpty")
              : latestRental?.status
                ? `${rentalsCount} ${t("profile.activity.total")} · ${t("profile.activity.latest")}: ${latestRental.status}`
                : `${rentalsCount} ${t("profile.activity.total")}`
          }
          tone="purple"
          onPress={() => router.push("/sell/list-for-rent")}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(480).delay(360)}>
        <ActivityCard
          icon="chatbubbles-outline"
          title={t("profile.activity.messagesTitle")}
          subtitle={
            unreadCount > 0
              ? `${unreadCount} ${t("profile.activity.unread")}`
              : t("profile.activity.messagesEmpty")
          }
          badge={unreadCount > 0 ? String(unreadCount) : undefined}
          tone="pool"
          onPress={() => router.push("/messages")}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(420)}>
        <ReferralCard />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(520).delay(480)}>
        <SettingsList
          appVersion={appVersion}
          onSignOut={onLogout}
          onDeleteAccount={() => router.push("/account/delete")}
        />
      </Animated.View>
    </Animated.ScrollView>
  );
}
