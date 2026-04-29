import client from "./client";
import type { ApiResponse, User, TokenResponse } from "../types";

export const login = (data: { username: string; password: string }): Promise<ApiResponse<TokenResponse>> =>
  client.post("/auth/login", data);

export const register = (data: { username: string; password: string }): Promise<ApiResponse<TokenResponse>> =>
  client.post("/auth/register", data);

export const fetchMe = (): Promise<ApiResponse<User>> =>
  client.get("/auth/me");

export const changePassword = (data: { old_password: string; new_password: string }): Promise<ApiResponse<null>> =>
  client.patch("/auth/password", data);

export const fetchUsers = (): Promise<ApiResponse<User[]>> =>
  client.get("/admin/users");

export const updateUser = (id: number, data: { is_active: boolean }): Promise<ApiResponse<null>> =>
  client.patch(`/admin/users/${id}?is_active=${data.is_active}`);

export const deleteUser = (id: number): Promise<ApiResponse<null>> =>
  client.delete(`/admin/users/${id}`);
