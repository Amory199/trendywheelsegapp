import type { UseQueryResult } from "@tanstack/react-query";
import * as React from "react";
import { View } from "react-native";

import { useHumanizeError } from "../lib/humanize-error";

import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { TWSkeletonCard } from "./ui";

// One-stop wrapper so every data screen handles loading / error / empty the
// same way. Drop it around a screen's content and a failed or slow API call
// can never leave the user on a blank screen or an endless spinner:
//   loading → skeleton placeholders
//   error   → friendly ErrorState with a working "Try again" (query.refetch)
//   empty   → EmptyState (only when isEmpty says so)
//   else    → the real content
export function QueryBoundary<T>({
  query,
  children,
  isEmpty,
  loading,
  empty,
  skeletonCount = 4,
}: {
  query: Pick<UseQueryResult<T>, "isLoading" | "isError" | "error" | "data" | "refetch">;
  children: React.ReactNode;
  // Return true when a *successful* response should render the empty state.
  isEmpty?: (data: T) => boolean;
  // Optional overrides for the loading / empty visuals.
  loading?: React.ReactNode;
  empty?: React.ReactNode;
  skeletonCount?: number;
}): React.JSX.Element {
  const humanize = useHumanizeError();

  if (query.isLoading) {
    return (
      <>
        {loading ?? (
          <View style={{ padding: 16, gap: 12 }}>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <TWSkeletonCard key={i} />
            ))}
          </View>
        )}
      </>
    );
  }

  if (query.isError) {
    return <ErrorState message={humanize(query.error)} onRetry={() => void query.refetch()} />;
  }

  if (isEmpty && query.data !== undefined && isEmpty(query.data)) {
    return <>{empty ?? <EmptyState />}</>;
  }

  return <>{children}</>;
}
