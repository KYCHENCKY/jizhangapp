import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Table, Spin, Tag, Progress } from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  TransactionOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";

import { useSummary } from "../hooks/useStatistics";
import { useByCategory } from "../hooks/useStatistics";
import { useBudgets } from "../hooks/useBudgets";
import { useTransactions } from "../hooks/useTransactions";
import { useCategories } from "../hooks/useCategories";
import { formatMoney, formatDate, getCurrentYearMonth } from "../utils/formatters";
import type { Transaction } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const { year, month } = getCurrentYearMonth();
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const { data: summary, isLoading: summaryLoading } = useSummary({
    start_date: `${monthStr}-01`,
    end_date: `${monthStr}-31`,
  });

  const { data: catStats } = useByCategory({
    start_date: `${monthStr}-01`,
    end_date: `${monthStr}-31`,
  });

  const { data: budgets } = useBudgets({ year, month });
  const { data: txns } = useTransactions({ page: 1, page_size: 10, sort_order: "desc" });
  const { data: categories } = useCategories();
  const incomeCats = categories?.filter((c) => c.type === "income") ?? [];
  const expenseCats = categories?.filter((c) => c.type === "expense") ?? [];

  if (summaryLoading) return <Spin style={{ display: "block", margin: "200px auto" }} />;

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

  const budgetList = budgets ?? [];

  const columns = [
    { title: "时间", dataIndex: "transaction_time", render: (v: string) => <span style={{ color: "#8c7568", fontSize: 13 }}>{formatDate(v)}</span>, width: 100 },
    { title: "类别", dataIndex: "category_name", render: (v: string | null, r: Transaction) => v ? <Tag>{r.category_icon} {v}</Tag> : <Tag color="default">未分类</Tag>, width: 100 },
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

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>
        {year}年{month}月 收支概览
      </h2>

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
              styles={{ body: { padding: "20px 24px" } }}
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

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="本月支出分类" size="small">
            {catStats && catStats.length > 0 ? (
              <ReactECharts option={pieOption} style={{ height: 280 }} />
            ) : (
              <div style={{ textAlign: "center", padding: 60, color: "#999" }}>暂无数据</div>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ marginRight: 8 }} />
                预算概览
              </span>
            }
            size="small"
          >
            {budgetList.length > 0 ? (
              budgetList.map((b) => {
                const isExceeded = b.severity === "exceeded";
                const isWarning = b.severity === "warning";
                const isOk = b.severity === "ok";
                return (
                <div
                  key={b.id}
                  style={{
                    marginBottom: 12,
                    padding: "12px 14px",
                    background: isExceeded ? "#fef3ed" : isWarning ? "#fffbf0" : "#f5faf5",
                    borderRadius: 12,
                    borderLeft: isExceeded ? "3px solid #e07060" : isWarning ? "3px solid #f5a623" : "3px solid #38a169",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span>
                      <Tag color={b.category_color}>{b.category_icon} {b.category_name}</Tag>
                      {b.period === "monthly" ? "月度" : b.period === "yearly" ? "年度" : "周度"}预算
                    </span>
                    <span style={{
                      color: isExceeded ? "#e07060" : isWarning ? "#f5a623" : "#38a169",
                      fontWeight: 600,
                    }}>
                      {formatMoney(b.spent)} / {formatMoney(b.amount)}
                    </span>
                  </div>
                  <Progress
                    percent={Math.round(b.spent_ratio * 100)}
                    status={isExceeded ? "exception" : isOk ? "success" : "active"}
                    strokeColor={isExceeded ? "#e07060" : isWarning ? { from: "#f5a623", to: "#f0835b" } : "#38a169"}
                    size="small"
                    strokeWidth={8}
                  />
                </div>
              )})
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                暂无预算
                <br />
                <a onClick={() => navigate("/budgets")}>去设置预算</a>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="最近交易"
        size="small"
        extra={<a onClick={() => navigate("/transactions")}>查看全部</a>}
      >
        <Table
          columns={columns}
          dataSource={txns?.items ?? []}
          rowKey="id"
          pagination={false}
          size="small"
          onRow={(r) => ({ onClick: () => navigate(`/transactions?id=${r.id}`), style: { cursor: "pointer" } })}
        />
      </Card>
    </div>
  );
}
