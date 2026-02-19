import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "./useQueryHelpers";
import type { PaginatedResponse } from "@/types/api";
import type { Shift, ShiftCreate, ShiftFilters, ShiftTemplate, ShiftTemplateCreate, ShiftTemplateUpdate, ShiftBulkAssign, ShiftCalendarDay } from "@/types/shift";

export function useShifts(filters: ShiftFilters = {}) {
  return useQuery({
    queryKey: queryKeys.shifts.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.page) params.page = String(filters.page);
      if (filters.per_page) params.per_page = String(filters.per_page);
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.driver_id) params.driver_id = filters.driver_id;
      if (filters.status) params.status = filters.status;
      const { data } = await api.get<PaginatedResponse<Shift>>("/api/shifts", { params });
      return data;
    },
  });
}

export function useShiftTemplates() {
  return useQuery({
    queryKey: queryKeys.shifts.templates(),
    queryFn: async () => {
      const { data } = await api.get<ShiftTemplate[]>("/api/shifts/templates");
      return data;
    },
  });
}

export function useShiftCalendar(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: queryKeys.shifts.calendar(dateFrom, dateTo),
    queryFn: async () => {
      const { data } = await api.get<ShiftCalendarDay[]>("/api/shifts/calendar", {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      return data;
    },
    enabled: !!dateFrom && !!dateTo,
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ShiftCreate) => {
      const { data } = await api.post<Shift>("/api/shifts", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shifts.all }),
  });
}

export function useBulkAssignShifts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ShiftBulkAssign) => {
      const { data } = await api.post("/api/shifts/bulk", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shifts.all }),
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shiftId: string) => {
      const { data } = await api.post<Shift>(`/api/shifts/${shiftId}/clockin`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shifts.all }),
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shiftId: string) => {
      const { data } = await api.post<Shift>(`/api/shifts/${shiftId}/clockout`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shifts.all }),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ShiftTemplateCreate) => {
      const { data } = await api.post<ShiftTemplate>("/api/shifts/templates", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shifts.templates() }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ShiftTemplateUpdate & { id: string }) => {
      const { data } = await api.put<ShiftTemplate>(`/api/shifts/templates/${id}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shifts.templates() }),
  });
}
