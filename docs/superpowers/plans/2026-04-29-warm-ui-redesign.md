# 暖色生活气息 UI 重设计 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将个人记账应用从默认 Ant Design 蓝白主题全面升级为暖色生活气息风格，覆盖所有 6 个页面和全局设计系统。

**Architecture:** 三层改造 — (1) 底层：Ant Design theme.tokens 覆盖全局配色；(2) 中间层：全局 CSS 定义渐变背景、卡片阴影、圆角动画；(3) 页面层：逐页调整内联样式和图表配色。不引入新依赖。

**Tech Stack:** React 19, Ant Design 6, ECharts 6, TypeScript, Vite

**修改的文件:**
- `frontend/src/App.tsx` — ConfigProvider theme.tokens
- `frontend/src/index.css` — 全局样式增强
- `frontend/src/components/layout/AppLayout.tsx` — 侧边栏暖色毛玻璃
- `frontend/src/pages/Dashboard.tsx` — 统计卡片、图表、最近交易
- `frontend/src/pages/StatisticsPage.tsx` — 控制栏、ECharts 主题、表格
- `frontend/src/pages/BudgetsPage.tsx` — 表格→卡片网格
- `frontend/src/pages/CategoriesPage.tsx` — 分类行、规则卡片
- `frontend/src/pages/ImportPage.tsx` — 上传区、进度条
- `frontend/src/pages/TransactionsPage.tsx` — 筛选栏、表格

---

### Task 1: Ant Design 全局主题覆盖

**Files:**
- Modify: `frontend/src/App.tsx:23-30`

- [ ] **Step 1: 替换 ConfigProvider theme.token**

将 `App.tsx` 中 ConfigProvider 的 theme 配置替换为完整的暖色主题 token：

```tsx
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
```

- [ ] **Step 2: 验证主题生效**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

预期：无 TypeScript 错误。

---

### Task 2: 全局 CSS 增强

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: 重写 index.css**

用以下内容替换 `frontend/src/index.css`：

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(135deg, #fef9f2 0%, #fdf5e6 50%, #fef8f0 100%);
  background-attachment: fixed;
  min-height: 100vh;
}

#root {
  min-height: 100vh;
}

/* Warm card override */
.ant-card {
  border-radius: 16px !important;
  box-shadow: 0 2px 16px rgba(240,131,91,0.06) !important;
  transition: box-shadow 0.3s ease, transform 0.3s ease !important;
}

.ant-card:hover {
  box-shadow: 0 4px 24px rgba(240,131,91,0.12) !important;
}

/* Warm table header */
.ant-table-thead > tr > th {
  background: #fdf5e6 !important;
  color: #4a3728 !important;
  font-weight: 600 !important;
  border-bottom: 2px solid #f0e4d8 !important;
}

/* Table row hover */
.ant-table-tbody > tr.ant-table-row:hover > td {
  background: #fef3ed !important;
}

/* Primary button glow */
.ant-btn-primary {
  box-shadow: 0 2px 8px rgba(240,131,91,0.25) !important;
  border-radius: 12px !important;
}

.ant-btn-primary:hover {
  box-shadow: 0 4px 16px rgba(240,131,91,0.35) !important;
}

/* Menu selected item */
.ant-menu-item-selected {
  background: #fef3ed !important;
  border-radius: 10px !important;
}

/* Tag rounded */
.ant-tag {
  border-radius: 8px !important;
}

/* Progress bar rounded */
.ant-progress-line .ant-progress-outer {
  border-radius: 6px !important;
}

/* Segmented */
.ant-segmented {
  border-radius: 12px !important;
}

.ant-segmented .ant-segmented-item-selected {
  border-radius: 10px !important;
}

/* Select dropdown */
.ant-select-dropdown {
  border-radius: 12px !important;
}

/* Table */
.ant-table {
  border-radius: 12px !important;
}

/* Statistic title */
.ant-statistic-title {
  color: #8c7568 !important;
  font-size: 13px !important;
}

.ant-statistic-content {
  font-weight: 700 !important;
}

/* Modal */
.ant-modal-content {
  border-radius: 16px !important;
}

/* Input, Select */
.ant-input,
.ant-select-selector,
.ant-picker {
  border-radius: 10px !important;
}
```

---

### Task 3: 侧边栏暖色毛玻璃

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: 改造 Sider 和整体布局**

将 `AppLayout.tsx` 中的 Sider 和 Content 替换为以下内容。关键改动：
- Sider theme 改为 "light"
- 自定义背景色和毛玻璃效果
- Content 去掉白色背景（全局渐变代替）
- Menu item 选中态用暖橙底色

```tsx
import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, theme } from "antd";
import {
  DashboardOutlined,
  UnorderedListOutlined,
  PieChartOutlined,
  DollarOutlined,
  AppstoreOutlined,
  ImportOutlined,
} from "@ant-design/icons";

const { Sider, Content } = Layout;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "仪表盘" },
  { key: "/transactions", icon: <UnorderedListOutlined />, label: "交易明细" },
  { key: "/statistics", icon: <PieChartOutlined />, label: "统计分析" },
  { key: "/budgets", icon: <DollarOutlined />, label: "预算管理" },
  { key: "/categories", icon: <AppstoreOutlined />, label: "分类管理" },
  { key: "/import", icon: <ImportOutlined />, label: "账单导入" },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

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
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: "transparent",
            borderInlineEnd: "none",
            marginTop: 8,
          }}
        />
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
```

---

### Task 4: 仪表盘页面

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: 重写统计卡片区（4 个 Statistic 卡片加左侧竖条装饰）**

将 `Row gutter={16}` 区域（第 78-91 行）替换为：

```tsx
<Row gutter={16} style={{ marginBottom: 20 }}>
  {[
    { title: "本月收入", value: summary?.total_income ?? 0, color: "#38a169", icon: <ArrowUpOutlined />, sign: "+" },
    { title: "本月支出", value: summary?.total_expense ?? 0, color: "#e07060", icon: <ArrowDownOutlined />, sign: "-" },
    { title: "本月结余", value: summary?.net ?? 0, color: "#f5a623", icon: <WalletOutlined />, sign: "" },
    { title: "交易笔数", value: summary?.transaction_count ?? 0, color: "#f0835b", icon: <TransactionOutlined />, sign: "", suffix: "笔" },
  ].map((item) => (
    <Col span={6} key={item.title}>
      <Card
        style={{
          borderLeft: `4px solid ${item.color}`,
          background: "linear-gradient(135deg, #fffdf9 0%, #fffaf5 100%)",
          borderRadius: 16,
        }}
        bodyStyle={{ padding: "20px 24px" }}
      >
        <div style={{ fontSize: 13, color: "#8c7568", marginBottom: 8 }}>{item.title}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: item.color }}>
            {item.sign}
          </span>
          <span style={{ fontSize: 28, fontWeight: 700, color: item.color }}>
            {item.suffix ? item.value : (item.value as number).toFixed(2)}
          </span>
          {!item.suffix && <span style={{ fontSize: 14, color: "#8c7568" }}>元</span>}
        </div>
      </Card>
    </Col>
  ))}
</Row>
```

- [ ] **Step 2: 更新饼图为暖色系 + 中心总金额**

将 pieOption（第 42-57 行）替换为：

```tsx
const totalExpense = catStats?.reduce((s, c) => s + c.total_amount, 0) ?? 0;
const pieOption = {
  tooltip: {
    trigger: "item",
    formatter: "{b}: ¥{c} ({d}%)",
    backgroundColor: "rgba(255,253,249,0.96)",
    borderColor: "#f0e4d8",
    textStyle: { color: "#4a3728" },
    borderRadius: 8,
  },
  graphic: {
    type: "text",
    left: "center",
    top: "42%",
    style: {
      text: `¥${totalExpense.toFixed(0)}`,
      textAlign: "center",
      fill: "#4a3728",
      fontSize: 18,
      fontWeight: 700,
    },
  },
  series: [
    {
      type: "pie",
      radius: ["50%", "75%"],
      itemStyle: { borderRadius: 6, borderColor: "#fffdf9", borderWidth: 3 },
      label: { show: false },
      emphasis: {
        scaleSize: 8,
        label: { show: true, fontSize: 14, fontWeight: "bold" },
      },
      data: (catStats ?? []).map((c) => ({
        name: c.category_name,
        value: c.total_amount,
        itemStyle: { color: c.category_color },
      })),
    },
  ],
};
```

- [ ] **Step 3: 更新预算预警区样式**

将预警项渲染（第 113-132 行）的 progress bar 和背景替换为：

```tsx
alertList.map((a) => (
  <div
    key={a.id}
    style={{
      marginBottom: 12,
      padding: "12px 14px",
      background: a.severity === "exceeded" ? "#fef3ed" : "#fffbf0",
      borderRadius: 12,
      borderLeft: a.severity === "exceeded" ? "3px solid #e07060" : "3px solid #f5a623",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <span>
        <Tag color={a.category_color}>{a.category_name}</Tag>
        {a.period === "monthly" ? "月度" : a.period === "yearly" ? "年度" : "周度"}预算
      </span>
      <span style={{ color: a.severity === "exceeded" ? "#e07060" : "#f5a623", fontWeight: 600 }}>
        {formatMoney(a.spent)} / {formatMoney(a.amount)}
      </span>
    </div>
    <Progress
      percent={Math.round(a.spent_ratio * 100)}
      status={a.severity === "exceeded" ? "exception" : "active"}
      strokeColor={a.severity === "exceeded" ? "#e07060" : { from: "#f5a623", to: "#f0835b" }}
      size="small"
      strokeWidth={8}
    />
  </div>
))
```

- [ ] **Step 4: 更新最近交易表格列定义**

将 columns（第 61-70 行）替换为，增加暖色样式：

```tsx
const columns = [
  { title: "时间", dataIndex: "transaction_time", render: (v: string) => <span style={{ color: "#8c7568", fontSize: 13 }}>{formatDate(v)}</span>, width: 100 },
  { title: "类别", dataIndex: "category_name", render: (v: string | null) => v ? <Tag>{v}</Tag> : <Tag color="default">未分类</Tag>, width: 90 },
  { title: "说明", dataIndex: "product_desc", ellipsis: true },
  {
    title: "金额", dataIndex: "amount", render: (v: number, r: { direction: string }) => {
      const isIncome = r.direction === "income";
      const isExpense = r.direction === "expense";
      return (
        <span style={{
          display: "inline-block",
          padding: "2px 10px",
          borderRadius: 8,
          background: isIncome ? "rgba(56,161,105,0.08)" : isExpense ? "rgba(224,112,96,0.08)" : "transparent",
          color: isIncome ? "#38a169" : isExpense ? "#e07060" : "#8c8c8c",
          fontWeight: 700,
          fontSize: 15,
        }}>
          {isIncome ? "+" : isExpense ? "-" : ""}{formatMoney(v)}
        </span>
      );
    }, width: 120,
  },
];
```

- [ ] **Step 5: 类型检查验证**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

预期：无 TypeScript 错误。

---

### Task 5: 统计分析页

**Files:**
- Modify: `frontend/src/pages/StatisticsPage.tsx`

- [ ] **Step 1: 控制栏改为悬浮胶囊条**

将控制栏 Card（第 187-222 行）替换为：

```tsx
<Card
  size="small"
  style={{
    marginBottom: 20,
    borderRadius: 20,
    background: "rgba(255,253,249,0.8)",
    backdropFilter: "blur(8px)",
    boxShadow: "0 2px 12px rgba(240,131,91,0.06)",
  }}
  bodyStyle={{ padding: "12px 20px" }}
>
  <Space wrap size="middle">
    <Segmented
      value={granularity}
      onChange={(v) => {
        setGranularity(v as Granularity);
        setSelectedCategory(null);
        setTxnPage(1);
      }}
      style={{ background: "#fdf5e6" }}
      options={[
        { value: "yearly", label: "按年" },
        { value: "monthly", label: "按月" },
        { value: "weekly", label: "按周" },
      ]}
    />
    {datePicker}
    <span style={{ color: "#8c7568", fontSize: 13 }}>
      账单来源：
    </span>
    <Segmented
      value={platform}
      onChange={(v) => {
        setPlatform(v as PlatformFilter);
        setTxnPage(1);
      }}
      style={{ background: "#fdf5e6" }}
      options={[
        { value: "all", label: "全部" },
        { value: "alipay", label: "支付宝" },
        { value: "wechat", label: "微信" },
      ]}
    />
    <span style={{ color: "#4a3728", fontSize: 14, fontWeight: 600 }}>
      {dateRange.label}
    </span>
  </Space>
</Card>
```

- [ ] **Step 2: 统计卡片统一加左侧竖条**

将 Row gutter（第 225-238 行）的 4 个 Card 替换为与 Dashboard 一致的左侧竖条卡片：

```tsx
<Row gutter={16} style={{ marginBottom: 20 }}>
  {[
    { title: `${dateRange.label} 收入`, value: summary?.total_income ?? 0, color: "#38a169", icon: <ArrowUpOutlined /> },
    { title: `${dateRange.label} 支出`, value: summary?.total_expense ?? 0, color: "#e07060", icon: <ArrowDownOutlined /> },
    { title: "结余", value: summary?.net ?? 0, color: "#f5a623", icon: <WalletOutlined /> },
    { title: "交易笔数", value: summary?.transaction_count ?? 0, color: "#f0835b", icon: <TransactionOutlined /> },
  ].map((item) => (
    <Col span={6} key={item.title}>
      <Card
        size="small"
        style={{
          borderLeft: `4px solid ${item.color}`,
          background: "linear-gradient(135deg, #fffdf9 0%, #fffaf5 100%)",
          borderRadius: 16,
        }}
        bodyStyle={{ padding: "16px 20px" }}
      >
        <div style={{ fontSize: 13, color: "#8c7568", marginBottom: 6 }}>{item.title}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>
          {(item.value as number).toFixed(2)}
        </div>
      </Card>
    </Col>
  ))}
</Row>
```

- [ ] **Step 3: 柱状图暖色渐变 + 圆角顶部**

将 barOption（第 89-106 行）替换为：

```tsx
const barOption = useMemo(() => {
  const data = periodData ?? [];
  return {
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "rgba(255,253,249,0.96)",
      borderColor: "#f0e4d8",
      textStyle: { color: "#4a3728" },
      borderRadius: 8,
    },
    legend: { data: ["收入", "支出"], textStyle: { color: "#4a3728" } },
    grid: { left: 60, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: "category" as const,
      data: data.map((p) => p.period_label),
      axisLabel: { rotate: granularity === "monthly" ? 45 : 0, color: "#8c7568" },
      axisLine: { lineStyle: { color: "#f0e4d8" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value" as const,
      splitLine: { lineStyle: { color: "rgba(140,117,104,0.08)" } },
      axisLabel: { color: "#8c7568" },
    },
    series: [
      {
        name: "收入", type: "bar", data: data.map((p) => p.income),
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "#48bb78" }, { offset: 1, color: "#38a169" }] },
        },
        emphasis: { itemStyle: { color: "#48bb78", shadowBlur: 10, shadowColor: "rgba(56,161,105,0.3)" } },
        barWidth: granularity === "yearly" ? 40 : granularity === "weekly" ? 12 : 24,
      },
      {
        name: "支出", type: "bar", data: data.map((p) => p.expense),
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "#f0835b" }, { offset: 1, color: "#e07060" }] },
        },
        emphasis: { itemStyle: { color: "#f0835b", shadowBlur: 10, shadowColor: "rgba(224,112,96,0.3)" } },
        barWidth: granularity === "yearly" ? 40 : granularity === "weekly" ? 12 : 24,
      },
    ],
  };
}, [periodData, granularity]);
```

- [ ] **Step 4: 饼图暖色系 + 中心总额**

将 pieOption（第 109-123 行）替换为：

```tsx
const totalCat = (catData ?? []).reduce((s, c) => s + c.total_amount, 0);
const pieOption = useMemo(() => ({
  tooltip: {
    trigger: "item" as const,
    formatter: "{b}: ¥{c} ({d}%)",
    backgroundColor: "rgba(255,253,249,0.96)",
    borderColor: "#f0e4d8",
    textStyle: { color: "#4a3728" },
    borderRadius: 8,
  },
  graphic: {
    type: "text", left: "center", top: "42%",
    style: { text: `¥${totalCat.toFixed(0)}`, textAlign: "center", fill: "#4a3728", fontSize: 17, fontWeight: 700 },
  },
  series: [{
    type: "pie",
    radius: ["48%", "74%"],
    itemStyle: { borderRadius: 6, borderColor: "#fffdf9", borderWidth: 3 },
    label: { show: true, formatter: "{b}\n{d}%", color: "#8c7568", fontSize: 11 },
    emphasis: { scaleSize: 8, label: { fontSize: 15, fontWeight: "bold" } },
    data: (catData ?? []).map((c) => ({
      name: c.category_name,
      value: c.total_amount,
      itemStyle: { color: c.category_color },
    })),
  }],
}), [catData, totalCat]);
```

- [ ] **Step 5: 趋势线暖色渐变**

将 lineOption（第 126-136 行）替换为：

```tsx
const lineOption = useMemo(() => ({
  tooltip: {
    trigger: "axis" as const,
    backgroundColor: "rgba(255,253,249,0.96)",
    borderColor: "#f0e4d8",
    textStyle: { color: "#4a3728" },
    borderRadius: 8,
  },
  legend: { data: ["收入", "支出"], textStyle: { color: "#4a3728" } },
  grid: { left: 60, right: 20, top: 20, bottom: 30 },
  xAxis: {
    type: "category" as const,
    data: (trendData ?? []).map((p) => p.period),
    axisLabel: { color: "#8c7568" },
    axisLine: { lineStyle: { color: "#f0e4d8" } },
  },
  yAxis: {
    type: "value" as const,
    splitLine: { lineStyle: { color: "rgba(140,117,104,0.08)" } },
    axisLabel: { color: "#8c7568" },
  },
  series: [
    {
      name: "收入", type: "line", smooth: true, symbol: "circle", symbolSize: 6,
      data: (trendData ?? []).map((p) => p.income),
      itemStyle: { color: "#38a169" },
      lineStyle: { width: 3 },
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: "rgba(56,161,105,0.2)" }, { offset: 1, color: "rgba(56,161,105,0.02)" }] } },
    },
    {
      name: "支出", type: "line", smooth: true, symbol: "circle", symbolSize: 6,
      data: (trendData ?? []).map((p) => p.expense),
      itemStyle: { color: "#e07060" },
      lineStyle: { width: 3 },
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: "rgba(224,112,96,0.2)" }, { offset: 1, color: "rgba(224,112,96,0.02)" }] } },
    },
  ],
}), [trendData]);
```

- [ ] **Step 6: 底部表格金额列替换为暖色底标签**

将 txnColumns 金额列 render 函数（第 166-175 行）替换为：

```tsx
{
  title: "金额", dataIndex: "amount", width: 110,
  render: (v: number, r: { direction: string }) => {
    const sign = r.direction === "income" ? "+" : r.direction === "expense" ? "-" : "";
    const isIncome = r.direction === "income";
    const isExpense = r.direction === "expense";
    return (
      <span style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 8,
        background: isIncome ? "rgba(56,161,105,0.08)" : isExpense ? "rgba(224,112,96,0.08)" : "transparent",
        color: isIncome ? "#38a169" : isExpense ? "#e07060" : "#8c8c8c",
        fontWeight: 700,
      }}>
        {sign}{formatMoney(v)}
      </span>
    );
  },
},
```

- [ ] **Step 7: 类型检查验证**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

预期：无 TypeScript 错误。

---

### Task 6: 预算管理页 — 表格转卡片网格

**Files:**
- Modify: `frontend/src/pages/BudgetsPage.tsx`

- [ ] **Step 1: 添加 CircularProgress 辅助组件**

在文件顶部（imports 之后、组件函数之前）添加一个简单的 SVG 环形进度组件：

```tsx
function CircularProgress({ percent, color, size = 64 }: { percent: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0e4d8" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill="#4a3728" fontSize={13} fontWeight={700}>
        {Math.round(percent)}%
      </text>
    </svg>
  );
}
```

- [ ] **Step 2: 替换表格为卡片网格**

将 `<Table>` 替换为卡片网格布局，删除 columns 定义，改用以下内容：

```tsx
{budgets && budgets.length > 0 ? (
  <Row gutter={16}>
    {budgets.map((b) => (
      <Col span={12} key={b.id} style={{ marginBottom: 16 }}>
        <Card
          style={{
            borderRadius: 16,
            borderLeft: b.severity === "exceeded" ? "4px solid #e07060" : "4px solid transparent",
            background: b.severity === "exceeded"
              ? "linear-gradient(135deg, #fef3ed 0%, #fffdf9 100%)"
              : "linear-gradient(135deg, #fffdf9 0%, #fffaf5 100%)",
          }}
          bodyStyle={{ padding: "20px 24px" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  display: "inline-block",
                  width: 12, height: 12, borderRadius: "50%",
                  background: b.category_color,
                  boxShadow: `0 0 6px ${b.category_color}40`,
                }} />
                <Tag color={b.category_color}>{b.category_name}</Tag>
                <span style={{ color: "#8c7568", fontSize: 13 }}>
                  {b.period === "monthly" ? "月度" : b.period === "yearly" ? "年度" : "周度"}
                </span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#8c7568" }}>已花费 </span>
                <span style={{
                  fontSize: 22, fontWeight: 700,
                  color: b.severity === "exceeded" ? "#e07060" : b.severity === "warning" ? "#f5a623" : "#38a169",
                }}>
                  {formatMoney(b.spent)}
                </span>
                <span style={{ color: "#8c7568", fontSize: 14 }}> / {formatMoney(b.amount)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Switch
                  size="small"
                  checked={b.is_active}
                  onChange={(checked) => updateMutation.mutate({ id: b.id, is_active: checked })}
                />
                <span style={{ color: "#8c7568", fontSize: 12 }}>
                  预警 {Math.round(b.alert_ratio * 100)}%
                </span>
                <Popconfirm title="确定删除？" onConfirm={() => deleteMutation.mutate(b.id, { onSuccess: () => message.success("已删除") })}>
                  <Button type="link" danger size="small">删除</Button>
                </Popconfirm>
              </div>
            </div>
            <CircularProgress
              percent={Math.round(b.spent_ratio * 100)}
              color={b.severity === "exceeded" ? "#e07060" : b.severity === "warning" ? "#f5a623" : "#38a169"}
            />
          </div>
        </Card>
      </Col>
    ))}
  </Row>
) : (
  <div style={{ textAlign: "center", padding: 80 }}>
    <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.4 }}>💳</div>
    <div style={{ fontSize: 16, color: "#8c7568", marginBottom: 8 }}>暂无预算</div>
    <div style={{ color: "#8c7568", marginBottom: 16 }}>设置预算可以帮助你更好地管理支出</div>
    <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
      添加第一条预算
    </Button>
  </div>
)}
```

- [ ] **Step 3: 清理不再使用的 import**

移除 `Progress` 和 `Empty` 从 antd import（表格相关），添加 `Row`, `Col`。

- [ ] **Step 4: 类型检查验证**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

预期：无 TypeScript 错误。

---

### Task 7: 分类管理页

**Files:**
- Modify: `frontend/src/pages/CategoriesPage.tsx`

- [ ] **Step 1: 分类表格行改为卡片风格 + 渐变色指示器**

将 catColumns（第 66-81 行）替换为：

```tsx
const catColumns = [
  {
    title: "名称", dataIndex: "name", width: 120,
    render: (v: string, r: Category) => (
      <Space>
        <span style={{
          display: "inline-block",
          width: 16, height: 16, borderRadius: "50%",
          background: `linear-gradient(135deg, ${r.color}, ${r.color}88)`,
          boxShadow: `0 2px 6px ${r.color}40`,
        }} />
        <span style={{ fontWeight: 500 }}>{v}</span>
      </Space>
    ),
  },
  {
    title: "颜色", dataIndex: "color", width: 70,
    render: (v: string) => (
      <span style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 8,
        background: `${v}18`,
        color: v,
        fontSize: 12,
        fontWeight: 600,
      }}>
        {v}
      </span>
    ),
  },
  {
    title: "交易数", dataIndex: "transaction_count", width: 70,
    render: (v: number) => (
      <span style={{
        display: "inline-block",
        minWidth: 32,
        textAlign: "center",
        padding: "2px 8px",
        borderRadius: 12,
        background: "#fdf5e6",
        color: "#4a3728",
        fontWeight: 600,
        fontSize: 13,
      }}>
        {v}
      </span>
    ),
  },
  {
    title: "操作", width: 120,
    render: (_: unknown, r: Category) => (
      <Space>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
          编辑
        </Button>
        <Popconfirm title="确定删除？" onConfirm={() => deleteMutation.mutate(r.id, { onSuccess: () => message.success("已删除") })}>
          <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
        </Popconfirm>
      </Space>
    ),
  },
];
```

- [ ] **Step 2: 选中行样式增强**

将 Table onRow 中的 style（第 121-124 行）替换为：

```tsx
onRow={(r) => ({
  onClick: () => setSelectedCat(r),
  style: {
    background: selectedCat?.id === r.id ? "#fef3ed" : undefined,
    borderLeft: selectedCat?.id === r.id ? "3px solid #f0835b" : "3px solid transparent",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
})}
```

- [ ] **Step 3: 规则区域改为独立小卡片**

将规则 Table（第 129-136 行）替换为规则卡片列表：

```tsx
{rules && rules.length > 0 ? (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {rules.map((rule) => (
      <div
        key={rule.id}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          background: "#fffdf9",
          borderRadius: 12,
          border: "1px solid #f0e4d8",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateX(4px)";
          e.currentTarget.style.boxShadow = "0 2px 12px rgba(240,131,91,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateX(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <Tag color="orange">{
          rule.field === "counterparty" ? "交易对方" :
          rule.field === "product_desc" ? "商品说明" : "交易类型"
        }</Tag>
        <Tag>{rule.match_mode === "contains" ? "包含" : rule.match_mode === "exact" ? "精确" : "正则"}</Tag>
        <span style={{ flex: 1, fontWeight: 500, color: "#4a3728", marginLeft: 8 }}>
          &ldquo;{rule.pattern}&rdquo;
        </span>
        <span style={{ color: "#8c7568", fontSize: 12, marginRight: 12 }}>
          优先级 {rule.priority}
        </span>
        <Popconfirm title="确定删除？" onConfirm={() => deleteRuleMutation.mutate(rule.id, { onSuccess: () => { message.success("已删除"); refetchRules(); } })}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      </div>
    ))}
  </div>
) : (
  <div style={{ textAlign: "center", padding: 40 }}>
    <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.3 }}>🏷️</div>
    <div style={{ color: "#8c7568", fontSize: 14 }}>
      暂无自动分类规则
    </div>
    <div style={{ color: "#8c7568", fontSize: 12, marginTop: 4 }}>
      添加规则后可自动为新导入的交易匹配分类
    </div>
  </div>
)}
```

- [ ] **Step 4: 类型检查验证**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

预期：无 TypeScript 错误。

---

### Task 8: 账单导入页

**Files:**
- Modify: `frontend/src/pages/ImportPage.tsx`

- [ ] **Step 1: 拖拽区暖色风格**

将 DRAG_STYLE 常量替换为暖色风格，并更新拖拽区样式：

```tsx
const DRAG_STYLE: React.CSSProperties = {
  width: "100%",
  height: 180,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  border: "2px dashed #f0d8c0",
  borderRadius: 20,
  background: "linear-gradient(135deg, #fffbf6 0%, #fef8f0 100%)",
  cursor: "pointer",
  transition: "all 0.3s ease",
};
```

- [ ] **Step 2: 添加移除文件按钮到预览列**

更新 DRAG_STYLE 使用处（第 268-283 行），已经用了动态样式，只需确保 isDragOver 时：

```tsx
style={{
  ...DRAG_STYLE,
  borderColor: isDragOver ? "#f0835b" : isUploading ? "#f0d8c0" : "#f0d8c0",
  background: isDragOver
    ? "linear-gradient(135deg, #fef3ed 0%, #fff5ee 100%)"
    : isUploading ? "#fafafa" : "linear-gradient(135deg, #fffbf6 0%, #fef8f0 100%)",
  cursor: isUploading ? "not-allowed" : "pointer",
  opacity: isUploading ? 0.7 : 1,
  transform: isDragOver ? "scale(1.01)" : "scale(1)",
}}
```

- [ ] **Step 3: 进度条暖橙渐变**

将进度条组件（第 285-289 行）替换为：

```tsx
{isUploading && (
  <div style={{ marginTop: 16 }}>
    <Progress
      percent={uploadProgress}
      strokeColor={{ from: "#f5a623", to: "#f0835b" }}
      strokeWidth={10}
      style={{ borderRadius: 8 }}
    />
  </div>
)}
```

- [ ] **Step 4: 已完成文件提示修改为暖绿色**

将 Alert 的 type="success" 保持不变（Ant Design 会用全局 theme success 色），但将上传完成后的文件状态 Tag（第 208-211 行）中的色值更新已经在全局 theme 中覆盖。

- [ ] **Step 5: 类型检查验证**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

预期：无 TypeScript 错误。

---

### Task 9: 交易明细页

**Files:**
- Modify: `frontend/src/pages/TransactionsPage.tsx`

- [ ] **Step 1: 金额列改为暖色底标签**

将 columns 中金额列的 render 函数（第 70-78 行）替换为：

```tsx
{
  title: "金额", dataIndex: "amount", width: 120,
  render: (v: number, r: Transaction) => {
    const isIncome = r.direction === "income";
    const isExpense = r.direction === "expense";
    const sign = isIncome ? "+" : isExpense ? "-" : "";
    return (
      <span style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 8,
        background: isIncome ? "rgba(56,161,105,0.08)" : isExpense ? "rgba(224,112,96,0.08)" : "transparent",
        color: isIncome ? "#38a169" : isExpense ? "#e07060" : "#8c8c8c",
        fontWeight: 700,
        fontSize: 15,
      }}>
        {sign}{formatMoney(v)}
      </span>
    );
  },
  sorter: true,
},
```

- [ ] **Step 2: 筛选区胶囊化**

将筛选区的 Space（第 94-147 行）包裹在一个圆角白色底容器中，让筛选器看起来更紧凑：

```tsx
<Card
  size="small"
  style={{
    marginBottom: 16,
    borderRadius: 16,
    background: "rgba(255,253,249,0.8)",
    boxShadow: "0 2px 12px rgba(240,131,91,0.05)",
  }}
  bodyStyle={{ padding: "12px 20px" }}
>
  <Space wrap size="small">
    <RangePicker ... />
    <Select ... />
    <Select ... />
    <Select ... />
    <Input ... />
  </Space>
</Card>
```

（保持原有各控件的逻辑不变，仅增加外层 Card 包裹）

- [ ] **Step 3: 表格轻微样式调整**

在 Table 组件上添加 className 依赖全局 CSS（已在 Task 2 中定义暖色表头和 hover 行样式），无需额外修改 Table props。

- [ ] **Step 4: 类型检查验证**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

预期：无 TypeScript 错误。

---

### Task 10: 最终验证与微调

- [ ] **Step 1: 完整 TypeScript 类型检查**

```bash
cd frontend && npx tsc --noEmit
```

预期：零错误。

- [ ] **Step 2: 启动开发服务器目视检查**

```bash
cd frontend && npx vite --host 0.0.0.0 &
```

打开浏览器访问，逐页检查：
- 侧边栏暖色毛玻璃是否生效
- 页面暖色渐变背景
- 卡片圆角和阴影
- 统计卡片左侧竖条
- ECharts 图表暖色系
- 预算管理卡片网格
- 分类管理渐变圆点和规则卡片
- 导入页暖色拖拽区
- 交易明细筛选栏和金额标签

- [ ] **Step 3: 修复发现的问题**

根据目视检查结果进行微调。
