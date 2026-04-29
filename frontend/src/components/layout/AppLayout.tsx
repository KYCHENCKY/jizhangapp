import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, theme, Button, Tag, Dropdown, Avatar } from "antd";
import {
  DashboardOutlined,
  UnorderedListOutlined,
  PieChartOutlined,
  DollarOutlined,
  AppstoreOutlined,
  ImportOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";

const { Sider, Content } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();
  const { user, logout } = useAuth();

  const menuItems = [
    { key: "/", icon: <DashboardOutlined />, label: "仪表盘" },
    { key: "/transactions", icon: <UnorderedListOutlined />, label: "交易明细" },
    { key: "/statistics", icon: <PieChartOutlined />, label: "统计分析" },
    { key: "/budgets", icon: <DollarOutlined />, label: "预算管理" },
    { key: "/categories", icon: <AppstoreOutlined />, label: "分类管理" },
    { key: "/import", icon: <ImportOutlined />, label: "账单导入" },
    ...(user?.is_admin ? [{ key: "/admin/users", icon: <TeamOutlined />, label: "用户管理" }] : []),
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={200}
        style={{
          background: "rgba(255,248,240,0.85)",
          backdropFilter: "blur(16px)",
          borderRight: "1px solid rgba(240,131,91,0.1)",
          boxShadow: "2px 0 16px rgba(240,131,91,0.06)",
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f0835b",
            fontSize: collapsed ? 16 : 20,
            fontWeight: 700,
            borderBottom: "1px solid rgba(240,131,91,0.12)",
            letterSpacing: collapsed ? 0 : 2,
          }}
        >
          {collapsed ? "记账" : "记账助手"}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname === "/admin/users" ? "/admin/users" : location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: "transparent",
            borderInlineEnd: "none",
            marginTop: 8,
          }}
        />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: collapsed ? "8px" : "12px 16px",
          borderTop: "1px solid #f0e4d8",
        }}>
          <Dropdown
            trigger={["click"]}
            placement="topLeft"
            menu={{
              items: [
                { key: "settings", icon: <SettingOutlined />, label: "个人设置" },
                ...(user?.is_admin ? [{ key: "admin", icon: <TeamOutlined />, label: "用户管理" }] : []),
                { type: "divider" },
                { key: "logout", icon: <LogoutOutlined />, label: "退出登录", danger: true },
              ],
              onClick: ({ key }) => {
                if (key === "logout") logout();
                else if (key === "settings") navigate("/settings");
                else if (key === "admin") navigate("/admin/users");
              },
            }}
          >
            <div style={{
              display: "flex", alignItems: "center",
              gap: collapsed ? 0 : 8,
              cursor: "pointer",
              borderRadius: 12,
              padding: collapsed ? "4px" : "6px 8px",
              justifyContent: collapsed ? "center" : "flex-start",
              transition: "background 0.2s",
            }}>
              <Avatar
                size={collapsed ? 28 : 32}
                icon={<UserOutlined />}
                style={{ background: "#f0835b", flexShrink: 0 }}
              />
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                  <div style={{ fontWeight: 600, color: "#4a3728", fontSize: 13 }}>
                    {user?.username}
                    {user?.is_admin && (
                      <Tag color="orange" style={{ marginLeft: 4, fontSize: 10, lineHeight: "16px" }}>管理员</Tag>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Dropdown>
        </div>
      </Sider>
      <Layout style={{ background: "transparent" }}>
        <Content
          style={{
            margin: 24,
            padding: 28,
            background: "rgba(255,253,249,0.7)",
            borderRadius: 20,
            boxShadow: "0 2px 16px rgba(240,131,91,0.06)",
            overflow: "auto",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
