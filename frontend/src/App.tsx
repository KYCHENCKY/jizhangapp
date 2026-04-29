import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, Spin } from "antd";
import zhCN from "antd/locale/zh_CN";

import { AuthProvider, useAuth } from "./hooks/useAuth";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import TransactionsPage from "./pages/TransactionsPage";
import StatisticsPage from "./pages/StatisticsPage";
import BudgetsPage from "./pages/BudgetsPage";
import CategoriesPage from "./pages/CategoriesPage";
import ImportPage from "./pages/ImportPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminUsersPage from "./pages/AdminUsersPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const storedToken = localStorage.getItem("token");
  if (loading && !storedToken) return <Spin style={{ display: "block", margin: "200px auto" }} size="large" />;
  if (!token && !storedToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: "#f0835b",
            colorSuccess: "#38a169",
            colorError: "#e07060",
            colorWarning: "#f5a623",
            colorInfo: "#f0835b",
            colorTextBase: "#4a3728",
            colorTextSecondary: "#8c7568",
            colorBgBase: "#fffdf9",
            colorBgContainer: "#fffdf9",
            colorBgLayout: "#fef9f2",
            colorBorder: "#f0e4d8",
            colorBorderSecondary: "#f5ebe0",
            borderRadius: 16,
            borderRadiusLG: 12,
            borderRadiusSM: 8,
            boxShadow: "0 2px 16px rgba(240,131,91,0.06)",
            boxShadowSecondary: "0 4px 24px rgba(240,131,91,0.12)",
            fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
          },
        }}
      >
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="statistics" element={<StatisticsPage />} />
                <Route path="budgets" element={<BudgetsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="import" element={<ImportPage />} />
                <Route path="admin/users" element={<AdminUsersPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
