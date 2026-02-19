import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "./useQueryHelpers";
import type { PaginatedResponse } from "@/types/api";
import type { Vehicle, VehicleCreate, VehicleUpdate, VehicleFilters } from "@/types/vehicle";

export function useVehicles(filters: VehicleFilters = {}) {
  return useQuery({
    queryKey: queryKeys.vehicles.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.page) params.page = String(filters.page);
      if (filters.per_page) params.per_page = String(filters.per_page);
      if (filters.status) params.status = filters.status;
      if (filters.vehicle_type) params.vehicle_type = filters.vehicle_type;
      if (filters.ownership) params.ownership = filters.ownership;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get<PaginatedResponse<Vehicle>>("/api/vehicles", { params });
      return data;
    },
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: queryKeys.vehicles.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Vehicle>(`/api/vehicles/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useSpareVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles.spare(),
    queryFn: async () => {
      const { data } = await api.get<Vehicle[]>("/api/vehicles/spare");
      return data;
    },
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: VehicleCreate) => {
      const { data } = await api.post<Vehicle>("/api/vehicles", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: VehicleUpdate & { id: string }) => {
      const { data } = await api.put<Vehicle>(`/api/vehicles/${id}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
  });
}

export function useAssignDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicleId, driverId }: { vehicleId: string; driverId: string }) => {
      const { data } = await api.post<Vehicle>(`/api/vehicles/${vehicleId}/assign`, null, {
        params: { driver_id: driverId },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all });
    },
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/vehicles/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
  });
}
