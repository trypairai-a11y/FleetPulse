"use client";

import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AxiosError } from "axios";

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (typeof data === "object" && data !== null) {
      if ("detail" in data && typeof data.detail === "string") return data.detail;
      if ("message" in data && typeof data.message === "string") return data.message;
    }
    if (error.response?.status === 401) return "Session expired. Please log in again.";
    if (error.response?.status === 403) return "You don't have permission to do that.";
    if (error.response?.status === 404) return "Resource not found.";
    if (error.response?.status === 409) return "Conflict — this may already exist.";
    if (error.response?.status && error.response.status >= 500) return "Server error. Please try again.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            // Skip if the mutation already has its own onError
            if (mutation.options.onError) return;
            toast.error(getErrorMessage(error));
          },
        }),
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
