"use client";
import { useState, useEffect, useCallback } from "react";
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
