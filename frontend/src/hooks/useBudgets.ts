import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/budgets";

export function useBudgets(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["budgets", params],
    queryFn: () => api.fetchBudgets(params).then((r) => r.data),
  });
}

export function useBudgetAlerts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["budgetAlerts", params],
    queryFn: () => api.fetchBudgetAlerts(params).then((r) => r.data),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createBudget,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budgetAlerts"] });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) => api.updateBudget(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budgetAlerts"] });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteBudget,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budgetAlerts"] });
    },
  });
}
