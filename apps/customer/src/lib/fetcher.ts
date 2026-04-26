"use client";

import { useQuery } from "@tanstack/react-query";

import { ACCESS_KEY, baseUrl, readToken } from "./api";

export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function useList<T>(
  path: string,
  key: string | readonly unknown[],
): { data: T[]; total: number; isLoading: boolean; refetch: () => void } {
  const q = useQuery({
    queryKey: Array.isArray(key) ? key : [key, path],
    queryFn: () => authedFetch<{ data: T[]; total?: number }>(path),
  });
  return {
    data: q.data?.data ?? [],
    total: q.data?.total ?? 0,
    isLoading: q.isLoading,
    refetch: () => void q.refetch(),
  };
}
