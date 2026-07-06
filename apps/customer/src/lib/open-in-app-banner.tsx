"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import type { JSX } from "react";

import { baseUrl } from "./api";

interface AppConfig {
  iosStoreUrl?: string;
  androidStoreUrl?: string;
}

// Shown at the top of a shared listing page opened in a web browser. On a phone
// with the app installed the universal/app link opens the app directly and this
// page never renders; when it does render (no app, or desktop), this nudges the
// visitor to install so they get the full listing + pricing.
export function OpenInAppBanner(): JSX.Element {
  const { data } = useQuery({
    queryKey: ["app-config"],
    queryFn: async (): Promise<AppConfig> => {
      const res = await fetch(`${baseUrl}/api/app-config`);
      const json = (await res.json()) as { data?: AppConfig };
      return json.data ?? {};
    },
    staleTime: 60 * 60 * 1000,
  });

  return (
    <div style={styles.wrap}>
      <div style={styles.left}>
        <span style={styles.title}>Get the TrendyWheels app</span>
        <span style={styles.sub}>See full details, pricing, and book in seconds.</span>
      </div>
      <div style={styles.actions}>
        {data?.iosStoreUrl ? (
          <a href={data.iosStoreUrl} style={styles.btn} target="_blank" rel="noreferrer">
            App Store
          </a>
        ) : null}
        {data?.androidStoreUrl ? (
          <a href={data.androidStoreUrl} style={styles.btn} target="_blank" rel="noreferrer">
            Google Play
          </a>
        ) : null}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 18px",
    background: `linear-gradient(90deg, ${colors.brand.friendlyBlue}, ${colors.brand.trendyPink})`,
    color: "#fff",
  },
  left: { display: "flex", flexDirection: "column" },
  title: { fontWeight: 800, fontSize: 15 },
  sub: { fontSize: 13, opacity: 0.9 },
  actions: { display: "flex", gap: 8 },
  btn: {
    background: "rgba(255,255,255,0.18)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    padding: "8px 14px",
    borderRadius: 999,
    textDecoration: "none",
  },
};
