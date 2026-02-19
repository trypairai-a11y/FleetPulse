import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "./useQueryHelpers";
import type { PaginatedResponse } from "@/types/api";
import type { Device, DeviceCreate, DeviceUpdate, DeviceFilters, DeviceCommand, DeviceCommandCreate, BulkCommandRequest } from "@/types/device";

export function useDevices(filters: DeviceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.devices.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.page) params.page = String(filters.page);
      if (filters.per_page) params.per_page = String(filters.per_page);
      if (filters.status) params.status = filters.status;
      if (filters.driver_id) params.driver_id = filters.driver_id;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get<PaginatedResponse<Device>>("/api/devices", { params });
      return data;
    },
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: queryKeys.devices.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Device>(`/api/devices/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useDeviceCommands(deviceId: string) {
  return useQuery({
    queryKey: queryKeys.devices.commands(deviceId),
    queryFn: async () => {
      const { data } = await api.get<DeviceCommand[]>(`/api/devices/${deviceId}/commands`);
      return data;
    },
    enabled: !!deviceId,
  });
}

export function useCreateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: DeviceCreate) => {
      const { data } = await api.post<Device>("/api/devices", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.devices.all }),
  });
}

export function useUpdateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: DeviceUpdate & { id: string }) => {
      const { data } = await api.put<Device>(`/api/devices/${id}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.devices.all }),
  });
}

export function useDeleteDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/devices/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.devices.all }),
  });
}

export function useSendCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: DeviceCommandCreate) => {
      const { data } = await api.post<DeviceCommand>("/api/devices/commands", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.devices.all }),
  });
}

export function useBulkCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: BulkCommandRequest) => {
      const { data } = await api.post("/api/devices/bulk-command", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.devices.all }),
  });
}
