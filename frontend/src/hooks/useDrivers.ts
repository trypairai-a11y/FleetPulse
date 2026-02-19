import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "./useQueryHelpers";
import type { PaginatedResponse } from "@/types/api";
import type { Driver, DriverCreate, DriverUpdate, DriverFilters, DriverStatsResponse, DriverLeaderboardEntry, DriverImportResponse } from "@/types/driver";

export function useDrivers(filters: DriverFilters = {}) {
  return useQuery({
    queryKey: queryKeys.drivers.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.page) params.page = String(filters.page);
      if (filters.per_page) params.per_page = String(filters.per_page);
      if (filters.status) params.status = filters.status;
      if (filters.platform) params.platform = filters.platform;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get<PaginatedResponse<Driver>>("/api/drivers", { params });
      return data;
    },
  });
}

export function useDriver(id: string) {
  return useQuery({
    queryKey: queryKeys.drivers.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Driver>(`/api/drivers/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useDriverStats(id: string) {
  return useQuery({
    queryKey: queryKeys.drivers.stats(id),
    queryFn: async () => {
      const { data } = await api.get<DriverStatsResponse>(`/api/drivers/${id}/stats`);
      return data;
    },
    enabled: !!id,
  });
}

export function useDriverLeaderboard() {
  return useQuery({
    queryKey: queryKeys.drivers.leaderboard(),
    queryFn: async () => {
      const { data } = await api.get<DriverLeaderboardEntry[]>("/api/drivers/leaderboard");
      return data;
    },
  });
}

export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: DriverCreate) => {
      const { data } = await api.post<Driver>("/api/drivers", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.drivers.all }),
  });
}

export function useUpdateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: DriverUpdate & { id: string }) => {
      const { data } = await api.put<Driver>(`/api/drivers/${id}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.drivers.all }),
  });
}

export function useDeleteDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/drivers/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.drivers.all }),
  });
}

export function useImportDrivers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<DriverImportResponse>("/api/drivers/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.drivers.all }),
  });
}
