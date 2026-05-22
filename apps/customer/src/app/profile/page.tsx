"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "next/navigation";

import { useAuth } from "../../lib/auth-store";
import { authedFetch } from "../../lib/fetcher";

import { ActivityCard } from "./_components/ActivityCard";
import { HeroStrip } from "./_components/HeroStrip";
import { KpiRow } from "./_components/KpiRow";
import { LoyaltyCard } from "./_components/LoyaltyCard";
import { ReferralCard } from "./_components/ReferralCard";
import { SettingsList } from "./_components/SettingsList";

// Mirrors the mobile profile (apps/mobile/app/(tabs)/profile.tsx) section-for-
// section so testers see the same IA on web as on the phone. Data fetches use
// authedFetch and the same endpoints the mobile app calls.

interface ListResponse<T> {
  data: T[];
  total?: number;
}

interface Booking {
  id: string;
  status?: string;
}
interface Listing {
  id: string;
  title?: string;
}
interface Repair {
  id: string;
  status?: string;
}

export default function ProfilePage(): JSX.Element {
  const router = useRouter();
  const { user, logout } = useAuth();

  const bookingsQ = useQuery<ListResponse<Booking>>({
    queryKey: ["profile-bookings"],
    queryFn: () => authedFetch("/api/bookings?limit=1"),
    enabled: !!user,
  });
  const listingsQ = useQuery<ListResponse<Listing>>({
    queryKey: ["profile-listings", user?.id],
    queryFn: () => authedFetch(`/api/sales?userId=${user?.id}&limit=1`),
    enabled: !!user,
  });
  const repairsQ = useQuery<ListResponse<Repair>>({
    queryKey: ["profile-repairs"],
    queryFn: () => authedFetch("/api/repairs?limit=1"),
    enabled: !!user,
  });

  if (!user) return <div style={{ padding: 24 }}>Loading…</div>;

  const tier = user.loyaltyTier ?? "bronze";
  const points = user.loyaltyPoints ?? 0;
  const bookingsCount = bookingsQ.data?.total ?? bookingsQ.data?.data?.length ?? 0;
  const listingsCount = listingsQ.data?.total ?? listingsQ.data?.data?.length ?? 0;
  const repairsCount = repairsQ.data?.total ?? repairsQ.data?.data?.length ?? 0;
  const latestBooking = bookingsQ.data?.data?.[0];
  const latestListing = listingsQ.data?.data?.[0];
  const latestRepair = repairsQ.data?.data?.[0];

  const onSignOut = (): void => {
    logout();
    router.push("/login");
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        maxWidth: "min(720px, 100%)",
        margin: "0 auto",
        padding: "8px 0 32px",
      }}
    >
      <h1
        style={{
          fontFamily: "Anton, Impact, system-ui, sans-serif",
          fontSize: "clamp(2rem, 7vw, 3rem)",
          textTransform: "uppercase",
          margin: 0,
          color: colors.brand.trustWorth,
        }}
      >
        My profile
        <span style={{ color: colors.brand.trendyPink }}>.</span>
      </h1>

      <HeroStrip name={user.name ?? "Welcome"} phone={user.phone} tier={tier} />

      <KpiRow
        stats={[
          { value: points.toLocaleString(), label: "Points" },
          { value: bookingsCount, label: "Bookings" },
          { value: listingsCount, label: "Listings" },
        ]}
      />

      <LoyaltyCard tier={tier} points={points} />

      <ActivityCard
        href="/rent/my-bookings"
        iconKey="bookings"
        title="My bookings"
        subtitle={
          bookingsCount === 0
            ? "No active bookings yet"
            : latestBooking?.status
              ? `${bookingsCount} total · latest: ${latestBooking.status}`
              : `${bookingsCount} total`
        }
        tone="blue"
      />
      <ActivityCard
        href="/sell/my-listings"
        iconKey="listings"
        title="My listings"
        subtitle={
          listingsCount === 0
            ? "Post your first listing"
            : latestListing?.title
              ? `${listingsCount} total · ${latestListing.title}`
              : `${listingsCount} total`
        }
        tone="pink"
      />
      <ActivityCard
        href="/repair"
        iconKey="repairs"
        title="My repairs"
        subtitle={
          repairsCount === 0
            ? "No repair requests"
            : latestRepair?.status
              ? `${repairsCount} total · latest: ${latestRepair.status}`
              : `${repairsCount} total`
        }
        tone="amber"
      />
      <ActivityCard
        href="/messages"
        iconKey="messages"
        title="Messages"
        subtitle="Conversations with the team"
        tone="pool"
      />

      <ReferralCard />

      <SettingsList appVersion="1.0.0" onSignOut={onSignOut} />
    </div>
  );
}
