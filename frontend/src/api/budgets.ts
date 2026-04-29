import client from "./client";
import type { ApiResponse, Budget } from "../types";

export const fetchBudgets = (params?: Record<string, unknown>): Promise<ApiResponse<Budget[]>> =>
  client.get("/budgets", { params });

export const createBudget = (data: Record<string, unknown>): Promise<ApiResponse<{ id: number; message: string }>> =>
  client.post("/budgets", data);

export const updateBudget = (id: number, data: Record<string, unknown>): Promise<ApiResponse<null>> =>
  client.patch(`/budgets/${id}`, data);

export const deleteBudget = (id: number): Promise<ApiResponse<null>> =>
  client.delete(`/budgets/${id}`);

export const fetchBudgetAlerts = (params?: Record<string, unknown>): Promise<ApiResponse<Budget[]>> =>
  client.get("/budgets/alerts", { params });
