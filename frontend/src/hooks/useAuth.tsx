import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as api from "../api/auth";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    if (token) {
      api.fetchMe().then(r => setUser(r.data)).catch(() => {
        localStorage.removeItem("token");
        setToken(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const r = await api.login({ username, password });
    localStorage.setItem("token", r.data.access_token);
    setToken(r.data.access_token);
    setUser(r.data.user);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const r = await api.register({ username, password });
    localStorage.setItem("token", r.data.access_token);
    setToken(r.data.access_token);
    setUser(r.data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
