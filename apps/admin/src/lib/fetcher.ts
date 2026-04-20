"use client";

import { useQuery } from "@tanstack/react-query";

import { readToken, ACCESS_KEY } from "./api";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

export function useList<T>(path: string, key: string): {
  data: T[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
} {
  const q = useQuery({
    queryKey: [key, path],
    queryFn: () => authedFetch<{ data: T[] }>(path),
  });
  return {
    data: q.data?.data ?? [],
    isLoading: q.isLoading,
    error: q.error,
    refetch: () => void q.refetch(),
  };
}
