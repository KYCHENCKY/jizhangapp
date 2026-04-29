import client from "./client";
import type { ApiResponse, Transaction, PaginatedResponse } from "../types";

export const fetchTransactions = (params: Record<string, unknown>): Promise<ApiResponse<PaginatedResponse<Transaction>>> =>
  client.get("/transactions", { params });

export const fetchTransaction = (id: number): Promise<ApiResponse<Transaction>> =>
  client.get(`/transactions/${id}`);

export const updateTransaction = (id: number, data: Record<string, unknown>): Promise<ApiResponse<null>> =>
  client.patch(`/transactions/${id}`, data);

export const batchUpdateTransactions = (ids: number[], category_id: number): Promise<ApiResponse<null>> =>
  client.patch("/transactions/batch", { ids, category_id });

export const deleteTransaction = (id: number): Promise<ApiResponse<null>> =>
  client.delete(`/transactions/${id}`);
