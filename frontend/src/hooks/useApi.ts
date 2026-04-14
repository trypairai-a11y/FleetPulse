"use client";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export function useApiGet<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!url) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: result } = await api.get(url);
      setData(result);
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.response?.status === 401 ? "Session expired. Please log in again." :
         err.response?.status === 403 ? "You don't have permission to view this data." :
         err.response?.status === 429 ? "Too many requests. Please wait a moment." :
         err.response?.status >= 500 ? "Server error. Please try again shortly." :
         err.message || "Failed to load data");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

/** Generic error display component data — use with useApiGet to show retry UI */
export function getErrorProps(error: string | null, refetch: () => void) {
  if (!error) return null;
  return { error, onRetry: refetch };
}

/** React Query hook — use this for new code. */
export function useApiQuery<T>(key: string[], url: string | null, options?: { enabled?: boolean; staleTime?: number; refetchInterval?: number }) {
  return useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      if (!url) throw new Error("No URL");
      const { data } = await api.get(url);
      return data;
    },
    enabled: !!url && (options?.enabled !== false),
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
  });
}

/** Mutation hook for POST/PUT/DELETE operations. */
export function useApiMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: { onSuccess?: (data: TData) => void; invalidateKeys?: string[][] }
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (options?.invalidateKeys) {
        for (const key of options.invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
      options?.onSuccess?.(data);
    },
  });
}
