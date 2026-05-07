"use client";

import { useQuery } from "@tanstack/react-query";

import { readToken, ACCESS_KEY } from "./api";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
  key: string,
): {
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
