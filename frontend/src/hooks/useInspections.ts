import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "./useQueryHelpers";
import type { VehicleInspection } from "@/types/vehicle";

export function useInspections(vehicleId: string) {
  return useQuery({
    queryKey: queryKeys.inspections.list(vehicleId),
    queryFn: async () => {
      const { data } = await api.get<VehicleInspection[]>(`/api/inspections`, {
        params: { vehicle_id: vehicleId },
      });
      return data;
    },
    enabled: !!vehicleId,
  });
}
