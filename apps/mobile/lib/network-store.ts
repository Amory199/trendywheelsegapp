import { create } from "zustand";

// Connectivity state without a native NetInfo module (not in the shipped
// binaries, so it can't be added via OTA). Signal sources:
//   - api-client's onNetworkStatus fires on every request outcome
//   - while offline, OfflineBanner pings /healthz every few seconds and
//     flips back as soon as one succeeds
interface NetworkState {
  online: boolean;
  setOnline: (online: boolean) => void;
}

export const useNetwork = create<NetworkState>((set) => ({
  online: true,
  setOnline: (online) => set((s) => (s.online === online ? s : { online })),
}));
