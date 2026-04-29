import client from "./client";
import type { ApiResponse, Summary, PeriodStat, CategoryStat, TrendPoint, DailyStat } from "../types";

export const fetchSummary = (params?: Record<string, unknown>): Promise<ApiResponse<Summary>> =>
  client.get("/statistics/summary", { params });

export const fetchByPeriod = (params: Record<string, unknown>): Promise<ApiResponse<PeriodStat[]>> =>
  client.get("/statistics/by-period", { params });

export const fetchByCategory = (params?: Record<string, unknown>): Promise<ApiResponse<CategoryStat[]>> =>
  client.get("/statistics/by-category", { params });

export const fetchTrend = (params?: Record<string, unknown>): Promise<ApiResponse<TrendPoint[]>> =>
  client.get("/statistics/trend", { params });

export const fetchDaily = (params: Record<string, unknown>): Promise<ApiResponse<DailyStat[]>> =>
  client.get("/statistics/daily", { params });
