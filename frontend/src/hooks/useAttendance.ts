import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "./useQueryHelpers";
import type { PaginatedResponse } from "@/types/api";
import type { AttendanceRecord, AttendanceCreate, AttendanceUpdate, AttendanceFilters, AttendanceSummary } from "@/types/attendance";

export function useAttendance(filters: AttendanceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.attendance.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.page) params.page = String(filters.page);
      if (filters.per_page) params.per_page = String(filters.per_page);
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.driver_id) params.driver_id = filters.driver_id;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get<PaginatedResponse<AttendanceRecord>>("/api/attendance", { params });
      return data;
    },
  });
}

export function useAttendanceSummary(date?: string) {
  return useQuery({
    queryKey: queryKeys.attendance.summary(date),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (date) params.date = date;
      const { data } = await api.get<AttendanceSummary>("/api/attendance/summary", { params });
      return data;
    },
  });
}

export function useCreateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AttendanceCreate) => {
      const { data } = await api.post<AttendanceRecord>("/api/attendance", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.attendance.all }),
  });
}

export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: AttendanceUpdate & { id: string }) => {
      const { data } = await api.put<AttendanceRecord>(`/api/attendance/${id}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.attendance.all }),
  });
}
