import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "./useQueryHelpers";
import type { PaginatedResponse } from "@/types/api";
import type { CapturedOrder, OrderFilters, OrderSummary, HourlyDistribution } from "@/types/order";

export function useOrders(filters: OrderFilters = {}) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.page) params.page = String(filters.page);
      if (filters.per_page) params.per_page = String(filters.per_page);
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.driver_id) params.driver_id = filters.driver_id;
      if (filters.platform) params.platform = filters.platform;
      const { data } = await api.get<PaginatedResponse<CapturedOrder>>("/api/orders", { params });
      return data;
    },
  });
}

export function useOrderSummary(date?: string) {
  return useQuery({
    queryKey: queryKeys.orders.summary(date),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (date) params.date = date;
      const { data } = await api.get<OrderSummary>("/api/orders/summary", { params });
      return data;
    },
  });
}

export function useHourlyDistribution(date?: string) {
  return useQuery({
    queryKey: queryKeys.orders.hourly(date),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (date) params.date = date;
      const { data } = await api.get<HourlyDistribution[]>("/api/orders/hourly", { params });
      return data;
    },
  });
}
