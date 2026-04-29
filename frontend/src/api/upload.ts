import client from "./client";
import type { ApiResponse, ImportBatch } from "../types";

export const uploadAlipay = (file: File): Promise<ApiResponse<{ batch: ImportBatch; preview: Record<string, unknown>[]; preview_total: number }>> => {
  const fd = new FormData();
  fd.append("file", file);
  return client.post("/upload/alipay", fd);
};

export const uploadWechat = (file: File): Promise<ApiResponse<{ batch: ImportBatch; preview: Record<string, unknown>[]; preview_total: number }>> => {
  const fd = new FormData();
  fd.append("file", file);
  return client.post("/upload/wechat", fd);
};

export const confirmImport = (batch_id: number): Promise<ApiResponse<{ new_count: number; categorized: number }>> =>
  client.post("/upload/confirm", { batch_id });

export const confirmAllImport = (batch_ids: number[]): Promise<ApiResponse<{ new_count: number; categorized: number; errors?: string[] }>> =>
  client.post("/upload/confirm-all", { batch_ids });

export const fetchBatches = (): Promise<ApiResponse<ImportBatch[]>> =>
  client.get("/upload/batches");

export const deleteBatch = (id: number): Promise<ApiResponse<{ deleted_transactions: number }>> =>
  client.delete(`/upload/batches/${id}`);

export const deleteAllBatches = (): Promise<ApiResponse<{ deleted_batches: number; deleted_transactions: number }>> =>
  client.delete("/upload/batches/all");
