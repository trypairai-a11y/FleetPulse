import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "./useQueryHelpers";
import type { MaintenanceRecord } from "@/types/vehicle";

export function useMaintenance(vehicleId: string) {
  return useQuery({
    queryKey: queryKeys.maintenance.list(vehicleId),
    queryFn: async () => {
      const { data } = await api.get<MaintenanceRecord[]>(`/api/maintenance`, {
        params: { vehicle_id: vehicleId },
      });
      return data;
    },
    enabled: !!vehicleId,
  });
}
