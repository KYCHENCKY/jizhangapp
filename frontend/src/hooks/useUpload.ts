import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/upload";

const ALL_CACHE_KEYS = ["batches", "transactions", "summary", "byCategory", "byPeriod", "trend", "budgetAlerts", "categories", "budgets"];

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  ALL_CACHE_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
}

export function useBatches() {
  return useQuery({
    queryKey: ["batches"],
    queryFn: () => api.fetchBatches().then((r) => r.data),
  });
}

export function useUploadAlipay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.uploadAlipay,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batches"] }),
  });
}

export function useUploadWechat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.uploadWechat,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batches"] }),
  });
}

export function useConfirmImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.confirmImport,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useConfirmAllImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.confirmAllImport,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteBatch,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteAllBatches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAllBatches,
    onSuccess: () => invalidateAll(qc),
  });
}
