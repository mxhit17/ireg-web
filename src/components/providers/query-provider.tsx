"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { isApiError } from "@/lib/api/errors";
import { sessionEvents } from "@/lib/auth/token-store";
import { authKeys } from "@/hooks/use-auth";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry client errors (401/403/404/422…) — only network/5xx.
          if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

/** When a background refresh proves the session is gone, flip the session query to signed-out. */
function SessionExpiryBridge() {
  const queryClient = useQueryClient();
  useEffect(
    () => sessionEvents.onExpired(() => queryClient.setQueryData(authKeys.session, null)),
    [queryClient],
  );
  return null;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionExpiryBridge />
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}
