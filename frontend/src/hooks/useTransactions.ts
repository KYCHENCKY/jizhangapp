import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/transactions";

export function useTransactions(params: Record<string, unknown>) {
  return useQuery({
    queryKey: ["transactions", params],
    queryFn: () => api.fetchTransactions(params).then((r) => r.data),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) => api.updateTransaction(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useBatchUpdateTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, category_id }: { ids: number[]; category_id: number }) =>
      api.batchUpdateTransactions(ids, category_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTransaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}
