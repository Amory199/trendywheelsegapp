// Singleton Socket.IO client connected to the API's /admin namespace.
//
// The API emits `lead.activity` / `lead.assigned` / `lead.rotated` /
// `lead.inactive` / `lead.updated` whenever a sales action mutates a lead.
// Admin screens subscribe (see hooks below) and invalidate their React Query
// caches so the UI stays in sync without manual pull-to-refresh.

import type { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";

import { getAccessToken } from "./api";

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

let socket: Socket | null = null;
let cachedToken: string | null = null;

export interface LeadEventPayload {
  leadId: string;
  actorId: string | null;
  type?: string;
  status?: string;
  ownerId?: string | null;
  previousOwnerId?: string | null;
  at: string;
}

// Returns the existing socket if one is connected with the current token,
// otherwise (re)connects. Token may be missing during sign-out — in which
// case the existing socket is disconnected and null returned.
async function ensureSocket(): Promise<Socket | null> {
  const token = await getAccessToken();
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
      cachedToken = null;
    }
    return null;
  }
  if (socket && cachedToken === token && socket.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = io(`${baseUrl}/admin`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1500,
  });
  cachedToken = token;
  return socket;
}

// Subscribe an admin screen to lead-event invalidations. Connect lazily on
// mount, disconnect when the consumer unmounts. The QueryClient is invalidated
// for any cache key starting with "crm" or "admin".
export function useAdminLeadRealtime(qc: QueryClient): void {
  useEffect(() => {
    let cancelled = false;
    let s: Socket | null = null;

    const invalidate = (): void => {
      void qc.invalidateQueries({ queryKey: ["crm"] });
      void qc.invalidateQueries({ queryKey: ["admin"] });
    };

    const handlers: Array<[string, (p: LeadEventPayload) => void]> = [
      ["lead.activity", invalidate],
      ["lead.assigned", invalidate],
      ["lead.rotated", invalidate],
      ["lead.inactive", invalidate],
      ["lead.updated", invalidate],
    ];

    void (async () => {
      s = await ensureSocket();
      if (cancelled || !s) return;
      for (const [event, fn] of handlers) {
        s.on(event, fn);
      }
    })();

    return () => {
      cancelled = true;
      if (s) {
        for (const [event, fn] of handlers) {
          s.off(event, fn);
        }
      }
    };
  }, [qc]);
}
