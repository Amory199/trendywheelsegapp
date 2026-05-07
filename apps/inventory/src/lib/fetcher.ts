"use client";

import { useQuery } from "@tanstack/react-query";

import { ACCESS_KEY, baseUrl, readToken } from "./api";

export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${readToken(ACCESS_KEY) ?? ""}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
