import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "./useQueryHelpers";
import type { PaginatedResponse } from "@/types/api";
import type { CashRecord, CashRecordCreate, CashFilters, CashSummary, OutstandingDriver } from "@/types/cash";

export function useCash(filters: CashFilters = {}) {
  return useQuery({
    queryKey: queryKeys.cash.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.page) params.page = String(filters.page);
      if (filters.per_page) params.per_page = String(filters.per_page);
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.driver_id) params.driver_id = filters.driver_id;
      if (filters.record_type) params.record_type = filters.record_type;
      if (filters.status) params.status = filters.status;
      const { data } = await api.get<PaginatedResponse<CashRecord>>("/api/cash", { params });
      return data;
    },
  });
}

export function useCashSummary(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: queryKeys.cash.summary(dateFrom, dateTo),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const { data } = await api.get<CashSummary>("/api/cash/summary", { params });
      return data;
    },
  });
}

export function useOutstandingDrivers() {
  return useQuery({
    queryKey: queryKeys.cash.outstanding(),
    queryFn: async () => {
      const { data } = await api.get<OutstandingDriver[]>("/api/cash/outstanding");
      return data;
    },
  });
}

export function useCreateCashRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CashRecordCreate) => {
      const { data } = await api.post<CashRecord>("/api/cash", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cash.all }),
  });
}

export function useCreateDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CashRecordCreate) => {
      const { data } = await api.post<CashRecord>("/api/cash/deposit", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cash.all }),
  });
}

export function useReconcileCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put<CashRecord>(`/api/cash/${id}/reconcile`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cash.all }),
  });
}
