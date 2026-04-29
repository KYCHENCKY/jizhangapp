import client from "./client";
import type { ApiResponse, Category, CategoryRule } from "../types";

export const fetchCategories = (type?: string): Promise<ApiResponse<Category[]>> =>
  client.get("/categories", { params: { type } });

export const createCategory = (data: Partial<Category>): Promise<ApiResponse<{ id: number; name: string }>> =>
  client.post("/categories", data);

export const updateCategory = (id: number, data: Record<string, unknown>): Promise<ApiResponse<null>> =>
  client.patch(`/categories/${id}`, data);

export const deleteCategory = (id: number): Promise<ApiResponse<null>> =>
  client.delete(`/categories/${id}`);

export const fetchRules = (categoryId: number): Promise<ApiResponse<CategoryRule[]>> =>
  client.get(`/categories/${categoryId}/rules`);

export const addRule = (categoryId: number, data: Partial<CategoryRule>): Promise<ApiResponse<CategoryRule>> =>
  client.post(`/categories/${categoryId}/rules`, data);

export const deleteRule = (ruleId: number): Promise<ApiResponse<null>> =>
  client.delete(`/categories/rules/${ruleId}`);

export const applyAllRules = (): Promise<ApiResponse<{ total_uncategorized: number; categorized: number }>> =>
  client.post("/categories/apply-all-rules");
