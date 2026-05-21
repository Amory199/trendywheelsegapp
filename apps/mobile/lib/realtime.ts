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
    // Allow polling fallback. Production Nginx in front of api.trendywheelseg.com
    // doesn't upgrade WebSocket frames yet (we'd need `proxy_set_header Upgrade
    // $http_upgrade` + `proxy_set_header Connection upgrade` on the /socket.io/
    // location). Without that, the WS-only handshake errors out with
    // TRANSPORT_HANDSHAKE_ERROR. Polling uses plain HTTP so it survives the
    // current proxy config; once Nginx is updated, both work.
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1500,
  });
  cachedToken = token;
  return socket;
}

// Subscribe an admin screen to ALL realtime invalidations — leads (CRM) and
// customer events (booking/sales/repair/maintenance/pickup/customization/
// signup). Connect lazily on mount, disconnect when the consumer unmounts.
// Each event invalidates the relevant React Query cache keys so admin sees
// changes within ~1s without manual pull-to-refresh.
export function useAdminLeadRealtime(qc: QueryClient): void {
  useEffect(() => {
    let cancelled = false;
    let s: Socket | null = null;

    const invalidateCrm = (): void => {
      void qc.invalidateQueries({ queryKey: ["crm"] });
      void qc.invalidateQueries({ queryKey: ["admin"] });
    };
    const invalidateBookings = (): void => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      void qc.invalidateQueries({ queryKey: ["bookings"] });
    };
    const invalidateRepairs = (): void => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      void qc.invalidateQueries({ queryKey: ["repair-requests"] });
      void qc.invalidateQueries({ queryKey: ["service-requests"] });
    };
    const invalidateSales = (): void => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      void qc.invalidateQueries({ queryKey: ["sales-listings"] });
    };
    const invalidateUsers = (): void => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      void qc.invalidateQueries({ queryKey: ["crm"] });
    };

    const handlers: Array<[string, (p: unknown) => void]> = [
      // CRM lead lifecycle
      ["lead.activity", invalidateCrm],
      ["lead.assigned", invalidateCrm],
      ["lead.rotated", invalidateCrm],
      ["lead.inactive", invalidateCrm],
      ["lead.updated", invalidateCrm],
      // Customer write events
      ["customer.booking.created", invalidateBookings],
      ["customer.booking.updated", invalidateBookings],
      ["customer.repair.created", invalidateRepairs],
      ["customer.repair.updated", invalidateRepairs],
      ["customer.maintenance.created", invalidateRepairs],
      ["customer.pickup.created", invalidateRepairs],
      ["customer.customization.created", invalidateRepairs],
      ["customer.sales-listing.created", invalidateSales],
      ["customer.sales-listing.updated", invalidateSales],
      ["customer.customer.signup", invalidateUsers],
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
