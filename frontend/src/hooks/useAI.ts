import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "@/hooks/useQueryHelpers";

// ── Alerts ──

export function useAlerts(params?: {
  status?: string;
  severity?: string;
  type?: string;
  page?: number;
  per_page?: number;
}) {
  return useQuery({
    queryKey: queryKeys.ai.alerts(params),
    queryFn: async () => {
      const { data } = await api.get("/api/ai/alerts", { params });
      return data as {
        items: AlertItem[];
        total: number;
        page: number;
        per_page: number;
      };
    },
  });
}

export function useAlertCount() {
  return useQuery({
    queryKey: queryKeys.ai.alertCount(),
    queryFn: async () => {
      const { data } = await api.get("/api/ai/alerts/count");
      return data as { count: number };
    },
    refetchInterval: 60000, // Every minute
  });
}

export function useUpdateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/api/ai/alerts/${id}`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.alerts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.alertCount() });
    },
  });
}

// ── Digest ──

export function useDigest() {
  return useQuery({
    queryKey: queryKeys.ai.digest(),
    queryFn: async () => {
      const { data } = await api.get("/api/ai/digest");
      return data as {
        digest: DigestItem | null;
        message?: string;
      };
    },
  });
}

export function useDigests(page = 1) {
  return useQuery({
    queryKey: queryKeys.ai.digests(page),
    queryFn: async () => {
      const { data } = await api.get("/api/ai/digests", { params: { page } });
      return data;
    },
  });
}

export function useGenerateDigest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/ai/digest/generate");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.digest() });
    },
  });
}

// ── Scores ──

export function useDriverScores(params?: { page?: number; per_page?: number; sort?: string }) {
  return useQuery({
    queryKey: queryKeys.ai.scores(params),
    queryFn: async () => {
      const { data } = await api.get("/api/ai/scores", { params });
      return data;
    },
  });
}

export function useDriverScore(driverId: string) {
  return useQuery({
    queryKey: queryKeys.ai.driverScore(driverId),
    queryFn: async () => {
      const { data } = await api.get(`/api/ai/scores/${driverId}`);
      return data as ScoreItem[];
    },
    enabled: !!driverId,
  });
}

export function useComputeScores() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/ai/scores/compute");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.scores() });
    },
  });
}

// ── Types ──

export interface AlertItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  title_ar: string | null;
  message: string;
  message_ar: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  data: Record<string, unknown>;
  status: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface DigestItem {
  id: string;
  date: string;
  content: {
    summary: string;
    highlights: string[];
    concerns: string[];
    recommendations: string[];
    metrics: {
      attendance_rate: number;
      total_orders: number;
      active_drivers: number;
      cash_outstanding: number;
    };
  };
  content_ar: {
    summary: string;
    highlights: string[];
    concerns: string[];
    recommendations: string[];
    metrics: {
      attendance_rate: number;
      total_orders: number;
      active_drivers: number;
      cash_outstanding: number;
    };
  } | null;
  generated_at: string;
}

export interface ScoreItem {
  id: string;
  date: string;
  composite_score: number;
  attendance_score: number | null;
  punctuality_score: number | null;
  performance_score: number | null;
  maintenance_score: number | null;
  trend: string | null;
}
