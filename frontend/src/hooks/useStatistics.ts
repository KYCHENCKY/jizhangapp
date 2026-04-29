import { useQuery } from "@tanstack/react-query";
import * as api from "../api/statistics";

export function useSummary(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["summary", params],
    queryFn: () => api.fetchSummary(params).then((r) => r.data),
  });
}

export function useByPeriod(params: Record<string, unknown>) {
  return useQuery({
    queryKey: ["byPeriod", params],
    queryFn: () => api.fetchByPeriod(params).then((r) => r.data),
    enabled: !!params.granularity,
  });
}

export function useByCategory(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["byCategory", params],
    queryFn: () => api.fetchByCategory(params).then((r) => r.data),
  });
}

export function useTrend(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["trend", params],
    queryFn: () => api.fetchTrend(params).then((r) => r.data),
  });
}

export function useDaily(params: Record<string, unknown>) {
  return useQuery({
    queryKey: ["daily", params],
    queryFn: () => api.fetchDaily(params).then((r) => r.data),
    enabled: !!params.year && !!params.month,
  });
}
