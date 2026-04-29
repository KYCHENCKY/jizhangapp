import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/categories";
import type { Category, CategoryRule } from "../types";

export function useCategories(type?: string) {
  return useQuery({
    queryKey: ["categories", type],
    queryFn: () => api.fetchCategories(type).then((r) => r.data),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) => api.updateCategory(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useRules(categoryId: number | null) {
  return useQuery({
    queryKey: ["rules", categoryId],
    queryFn: () => api.fetchRules(categoryId!).then((r) => r.data),
    enabled: !!categoryId,
  });
}

export function useAddRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, ...data }: { categoryId: number } & Partial<CategoryRule>) =>
      api.addRule(categoryId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rules"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rules"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useApplyAllRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.applyAllRules,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
