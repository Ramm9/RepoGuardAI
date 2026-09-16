"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/errors";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Application providers.
 *
 * The QueryClient is created lazily inside state so that it is never shared
 * between requests during server rendering, and retry behaviour is tuned to the
 * nature of the failure: never retry a 4xx (the request will fail identically),
 * always retry a transient network or 5xx error, with a short backoff.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // GitHub-derived data goes stale quickly; revalidate on window focus.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && !error.isTransient) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  // Server: a fresh client per render so requests never share a cache.
  if (typeof window === "undefined") return makeQueryClient();

  // Browser: one long-lived client for the tab.
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
