"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";

import { authedFetch } from "../../lib/fetcher";

interface Conversation {
  id: string;
  lastMessageAt: string | null;
  participants: Array<{ userId: string; user?: { id: string; name: string } }>;
  messages: Array<{ id: string; message: string; createdAt: string }>;
}

export default function MessagesPage(): JSX.Element {
  const q = useQuery({
    queryKey: ["customer-conversations"],
    queryFn: () => authedFetch<{ data: Conversation[] }>("/api/messages/conversations"),
  });

  const list = q.data?.data ?? [];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1
        style={{
          fontFamily: "Anton, Impact, system-ui, sans-serif",
          fontSize: 48,
          textTransform: "uppercase",
          margin: 0,
          color: colors.brand.trustWorth,
        }}
      >
        Messages
        <span style={{ color: colors.brand.trendyPink }}>.</span>
      </h1>

      {q.isLoading ? (
        <div style={{ color: "#6B6A85" }}>Loading…</div>
      ) : list.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: "#6B6A85" }}>
          No conversations yet. Reach out to support if you need help with a booking.
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #ECECF1", borderRadius: 16, overflow: "hidden" }}>
          {list.map((c) => {
            const last = c.messages[0];
            const others = c.participants.filter((p) => p.user).map((p) => p.user?.name ?? "User");
            return (
              <div
                key={c.id}
                style={{
                  padding: 18,
                  borderBottom: "1px solid #F0F0F8",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    background: `linear-gradient(135deg, ${colors.brand.friendlyBlue}, ${colors.brand.trendyPink})`,
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  {(others[0]?.[0] ?? "?").toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{others.join(", ")}</div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#6B6A85",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {last?.message ?? "(no messages)"}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#A0A0B0", whiteSpace: "nowrap" }}>
                  {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString() : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
