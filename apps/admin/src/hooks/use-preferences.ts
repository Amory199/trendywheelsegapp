"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserPreferences } from "@trendywheels/types";

import { ACCESS_KEY, readToken } from "../lib/api";
import { useAuth } from "../lib/auth-store";

// Deep partial of UserPreferences for PATCH payloads. We can't pull the
// inferred type from validators directly because workspace deps don't go
// validators → admin; this keeps coupling loose.
export type UserPreferencesPatch = {
  ui?: { tours?: Record<string, boolean>; tooltips?: "on" | "off"; introSeen?: boolean };
  notifications?: Partial<NonNullable<UserPreferences["notifications"]>>;
  theme?: UserPreferences["theme"];
  language?: UserPreferences["language"];
  marketingOptIn?: boolean;
};

interface UsePreferencesResult {
  preferences: UserPreferences | null;
  update: (patch: UserPreferencesPatch) => Promise<void>;
  isUpdating: boolean;
}

// Reads preferences off the hydrated auth-store user, exposes a PATCH mutation
// that merges optimistically and revalidates from the server response. Falls
// back to a silent no-op if the API call fails — preferences are nice-to-have,
// not load-bearing.
export function usePreferences(): UsePreferencesResult {
  const user = useAuth((s) => s.user);
  const setUser = useAuth.setState;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (patch: UserPreferencesPatch): Promise<UserPreferences> => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/users/me/preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}`,
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`PATCH /preferences failed (${res.status})`);
      const body = (await res.json()) as { data: UserPreferences };
      return body.data;
    },
    onMutate(patch) {
      // Optimistic merge — flush server-state through onSuccess.
      const current = useAuth.getState().user;
      if (!current) return;
      setUser({
        user: {
          ...current,
          preferences: deepMerge(current.preferences, patch) as UserPreferences,
        },
      });
    },
    onSuccess(serverPrefs) {
      const current = useAuth.getState().user;
      if (!current) return;
      setUser({ user: { ...current, preferences: serverPrefs } });
      void queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });

  return {
    preferences: user?.preferences ?? null,
    update: async (patch) => {
      await mutation.mutateAsync(patch);
    },
    isUpdating: mutation.isPending,
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge(current: unknown, patch: unknown): unknown {
  if (!isPlainObject(patch)) return patch;
  const base: Record<string, unknown> = isPlainObject(current) ? { ...current } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    base[k] = isPlainObject(v) ? deepMerge(base[k], v) : v;
  }
  return base;
}
