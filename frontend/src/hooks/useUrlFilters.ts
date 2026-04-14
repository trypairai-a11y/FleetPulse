"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * Syncs filter state to URL query params for browser back/forward support.
 * Usage:
 *   const { filters, setFilter, setFilters, clearFilters, buildApiUrl } = useUrlFilters({
 *     defaults: { page: "1", limit: "20", platform: "TALABAT" }
 *   });
 */
export function useUrlFilters(options?: { defaults?: Record<string, string> }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const defaults = options?.defaults || {};

  const filters = useMemo(() => {
    const result: Record<string, string> = { ...defaults };
    searchParams.forEach((value, key) => {
      if (value) result[key] = value;
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "" || value === defaults[key]) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Reset page when changing filters (except when changing page itself)
      if (key !== "page") params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, pathname, router]
  );

  const setFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      let resetPage = false;
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
        if (key !== "page") resetPage = true;
      }
      if (resetPage) params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  /** Build an API URL with current filters as query params. */
  const buildApiUrl = useCallback(
    (baseUrl: string, extraParams?: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, value);
      }
      if (extraParams) {
        for (const [key, value] of Object.entries(extraParams)) {
          if (value) params.set(key, value);
        }
      }
      const qs = params.toString();
      return qs ? `${baseUrl}?${qs}` : baseUrl;
    },
    [filters]
  );

  return { filters, setFilter, setFilters, clearFilters, buildApiUrl };
}
