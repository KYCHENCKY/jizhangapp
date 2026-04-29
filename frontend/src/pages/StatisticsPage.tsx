import { useState, useMemo, useEffect, useCallback } from "react";
import { Row, Col, Card, Segmented, DatePicker, Spin, Empty, Table, Tag, Button, Space } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, WalletOutlined, TransactionOutlined } from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(isoWeek);

import { useByPeriod, useByCategory, useTrend, useSummary, useDaily } from "../hooks/useStatistics";
import { useTransactions } from "../hooks/useTransactions";
import { useCategories } from "../hooks/useCategories";
import { formatMoney, formatDate, formatDateTime } from "../utils/formatters";
import ExpenseCalendar from "../components/ExpenseCalendar";
import CategoryRanking from "../components/CategoryRanking";
import type { PeriodStat } from "../types";

type Granularity = "yearly" | "monthly" | "weekly";
type PlatformFilter = "all" | "alipay" | "wechat";
type DirType = "expense" | "income";

const DIR_LABEL: Record<DirType, string> = { expense: "支出", income: "收入" };

export default function StatisticsPage() {
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [txnPage, setTxnPage] = useState(1);
  const [calendarYear, setCalendarYear] = useState(dayjs().year());
  const [calendarMonth, setCalendarMonth] = useState(dayjs().month() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [direction, setDirection] = useState<DirType>("expense");
  const [txnSort, setTxnSort] = useState<"time" | "amount">("time");

  const { data: categories } = useCategories();
  const expenseCats = categories?.filter((c) => c.type === "expense") ?? [];
  const incomeCats = categories?.filter((c) => c.type === "income") ?? [];
  const dirCats = direction === "expense" ? expenseCats : incomeCats;
  const catMap = useMemo(() => {
    const m: Record<number, { name: string; color: string }> = {};
    categories?.forEach((c) => { m[c.id] = { name: c.name, color: c.color }; });
    return m;
  }, [categories]);

  // Sync calendar to selected date when granularity is monthly
  useEffect(() => {
    if (granularity === "monthly") {
      setCalendarYear(selectedDate.year());
      setCalendarMonth(selectedDate.month() + 1);
    }
  }, [granularity, selectedDate]);

  // Build date range for the selected period
  const dateRange = useMemo(() => {
    if (granularity === "yearly") {
      const y = selectedDate.year();
      return { start_date: `${y}-01-01`, end_date: `${y}-12-31`, label: `${y}年` };
    }
    if (granularity === "monthly") {
      const start = selectedDate.startOf("month").format("YYYY-MM-DD");
      const end = selectedDate.endOf("month").format("YYYY-MM-DD");
      return { start_date: start, end_date: end, label: selectedDate.format("YYYY年M月") };
    }
    // weekly
    const start = selectedDate.startOf("isoWeek").format("YYYY-MM-DD");
    const end = selectedDate.endOf("isoWeek").format("YYYY-MM-DD");
    return { start_date: start, end_date: end, label: `${start} ~ ${end}` };
  }, [granularity, selectedDate]);

  // Build common params with optional platform filter
  const commonParams = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (platform !== "all") p.source_platform = platform;
    return p;
  }, [platform]);

  // API queries
  const { data: summary } = useSummary({ ...dateRange, ...commonParams });
  const { data: periodData, isLoading: periodLoading } = useByPeriod({
    granularity,
    ...commonParams,
    direction,
    start_date: granularity === "yearly" ? `${selectedDate.year()}-01-01` : undefined,
    end_date: granularity === "yearly" ? `${selectedDate.year()}-12-31` : undefined,
  });
  const { data: catData } = useByCategory({
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
    direction,
    ...commonParams,
  });
  const { data: trendData } = useTrend({ granularity: "monthly", months: 12, ...commonParams });
  const { data: dailyData } = useDaily({
    year: calendarYear,
    month: calendarMonth,
    ...commonParams,
  });

  const handleCategorySelect = useCallback((catId: number | null) => {
    setSelectedCategory(catId);
    setSelectedDay(null);
    setTxnPage(1);
  }, []);

  const handleDayClick = useCallback((date: string) => {
    setSelectedDay(date);
    setSelectedCategory(null);
    setTxnPage(1);
  }, []);

  const tableQuery = useMemo(() => {
    const q: Record<string, unknown> = {
      page: txnPage,
      page_size: 20,
      sort_by: txnSort === "amount" ? "amount" : "transaction_time",
      sort_order: "desc",
      start_date: selectedDay || dateRange.start_date,
      end_date: selectedDay || dateRange.end_date,
      direction,
    };
    if (selectedCategory) q.category_id = selectedCategory;
    if (platform !== "all") q.source_platform = platform;
    return q;
  }, [dateRange, selectedCategory, selectedDay, txnPage, platform, direction, txnSort]);
  const { data: txnData } = useTransactions(tableQuery);

  // Bar chart — single-direction bars
  const barOption = useMemo(() => {
    const data = periodData ?? [];
    const n = data.length || 1;
    const barW = Math.max(6, Math.min(24, (data.length > 20 ? 600 : 480) / n));
    const isIncome = direction === "income";
    const barColor = isIncome
      ? { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: "#48bb78" }, { offset: 1, color: "#38a169" }] }
      : { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: "#f0835b" }, { offset: 1, color: "#e07060" }] };
    const vals = data.map((p) => (isIncome ? p.income : p.expense));

    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "rgba(255,253,249,0.96)",
        borderColor: "#f0e4d8",
        textStyle: { color: "#4a3728" },
        borderRadius: 8,
      },
      grid: { left: 60, right: 20, top: 24, bottom: granularity === "monthly" ? 70 : 50 },
      xAxis: {
        type: "category" as const,
        data: data.map((p) => p.period_label),
        axisLabel: { rotate: granularity === "monthly" ? 45 : 0, color: "#8c7568", fontSize: 10 },
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
          name: DIR_LABEL[direction],
          type: "bar",
          data: vals,
          itemStyle: { borderRadius: [8, 8, 0, 0], color: barColor },
          barWidth: barW,
          barMaxWidth: 30,
          barCategoryGap: "30%",
        },
      ],
    };
  }, [periodData, granularity, direction]);

  // Pie chart for category breakdown
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

  // Trend line
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

  // Date picker based on granularity
  const datePicker = useMemo(() => {
    if (granularity === "yearly") {
      return <DatePicker picker="year" value={selectedDate} onChange={(d) => { if (d) { setSelectedDate(d); setTxnPage(1); } }} />;
    }
    if (granularity === "monthly") {
      return <DatePicker picker="month" value={selectedDate} onChange={(d) => { if (d) { setSelectedDate(d); setTxnPage(1); } }} />;
    }
    return <DatePicker value={selectedDate} onChange={(d) => { if (d) { setSelectedDate(d); setTxnPage(1); } }} />;
  }, [granularity, selectedDate]);

  const txnColumns = [
    { title: "时间", dataIndex: "transaction_time", render: (v: string) => formatDateTime(v), width: 150 },
    {
      title: "收/支", dataIndex: "direction", width: 80,
      render: (v: string) =>
        v === "income" ? <Tag color="green">收入</Tag> :
        v === "expense" ? <Tag color="red">支出</Tag> :
        <Tag color="default">不计收支</Tag>,
    },
    {
      title: "分类", dataIndex: "category_name", width: 100,
      render: (v: string | null) => v ? <Tag>{v}</Tag> : <Tag color="default">未分类</Tag>,
    },
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
    {
      title: "平台", dataIndex: "source_platform", width: 75,
      render: (v: string) => v === "alipay" ? <Tag color="blue">支付宝</Tag> : <Tag color="green">微信</Tag>,
    },
    { title: "对方", dataIndex: "counterparty", width: 110, ellipsis: true },
    { title: "说明", dataIndex: "product_desc", ellipsis: true },
  ];

  const dirLabel = DIR_LABEL[direction];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>统计分析</h2>

      {/* Controls */}
      <Card
        size="small"
        style={{
          marginBottom: 20,
          borderRadius: 20,
          background: "rgba(255,253,249,0.8)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 12px rgba(240,131,91,0.06)",
        }}
        styles={{ body: { padding: "12px 20px" } }}
      >
        <Space wrap size="middle">
          <Segmented
            value={granularity}
            onChange={(v) => {
              setGranularity(v as Granularity);
              setSelectedCategory(null);
              setSelectedDay(null);
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
          <span style={{ color: "#8c7568", fontSize: 13 }}>账单来源：</span>
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
          <span style={{ color: "#8c7568", fontSize: 13, marginLeft: 4 }}>查看：</span>
          <Segmented
            value={direction}
            onChange={(v) => {
              setDirection(v as DirType);
              setSelectedCategory(null);
              setSelectedDay(null);
              setTxnPage(1);
            }}
            style={{ background: direction === "income" ? "#f0fff4" : "#fef3ed" }}
            options={[
              { value: "expense", label: "支出" },
              { value: "income", label: "收入" },
            ]}
          />
          <span style={{ color: "#4a3728", fontSize: 14, fontWeight: 600 }}>
            {dateRange.label}
          </span>
        </Space>
      </Card>

      {/* Summary cards */}
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
              styles={{ body: { padding: "16px 20px" } }}
            >
              <div style={{ fontSize: 13, color: "#8c7568", marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>
                {(item.value as number).toFixed(2)}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Row 1: Pie chart + Category ranking — at top */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={10}>
          <Card
            title={`${dirLabel}分类占比${selectedCategory ? ` - ${catMap[selectedCategory]?.name || ""}` : ""}`}
            size="small"
            extra={selectedCategory ? <Button size="small" onClick={() => handleCategorySelect(null)}>清除筛选</Button> : undefined}
          >
            {(catData?.length ?? 0) > 0 ? (
              <ReactECharts
                option={pieOption}
                style={{ height: 280 }}
                onEvents={{
                  click: (params: { name: string }) => {
                    const found = dirCats.find((c) => c.name === params.name);
                    if (found) {
                      handleCategorySelect(found.id === selectedCategory ? null : found.id);
                    }
                  },
                }}
              />
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <CategoryRanking
            catData={catData ?? []}
            selectedCategory={selectedCategory}
            onSelect={handleCategorySelect}
            totalExpense={totalCat}
            title={`${dirLabel}分类排行`}
          />
        </Col>
      </Row>

      {/* Row 2: Bar chart + Calendar side by side */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card title={`${dirLabel}对比`} size="small">
            {periodLoading ? <Spin style={{ display: "block", margin: "60px auto" }} /> : (periodData?.length ?? 0) > 0 ? (
              <ReactECharts option={barOption} style={{ height: 260 }} />
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <ExpenseCalendar
            dailyData={dailyData ?? []}
            year={calendarYear}
            month={calendarMonth}
            onMonthChange={(y, m) => { setCalendarYear(y); setCalendarMonth(m); }}
            onDayClick={handleDayClick}
            direction={direction}
          />
        </Col>
      </Row>

      {/* Transactions */}
      <Card
        title={
          <Space wrap>
            <span>
              {selectedCategory
                ? `${catMap[selectedCategory]?.name || ""} ${dirLabel}排行`
                : selectedDay
                  ? `${selectedDay} 交易明细`
                  : `${dateRange.label} 交易明细（${dirLabel}）`}
            </span>
            <Segmented
              size="small"
              value={txnSort}
              onChange={(v) => { setTxnSort(v as "time" | "amount"); setTxnPage(1); }}
              style={{ background: "#fdf5e6" }}
              options={[
                { value: "time", label: "按时间" },
                { value: "amount", label: "按金额" },
              ]}
            />
            {(selectedCategory || selectedDay) && (
              <Button size="small" onClick={() => { handleCategorySelect(null); setSelectedDay(null); }}>
                清除筛选
              </Button>
            )}
          </Space>
        }
        size="small"
      >
        <Table
          columns={txnColumns}
          dataSource={txnData?.items ?? []}
          rowKey="id"
          size="small"
          pagination={{
            current: txnPage,
            pageSize: 20,
            total: txnData?.total ?? 0,
            showTotal: (t) => `共 ${t} 条`,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            onChange: (p) => setTxnPage(p),
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Trend line */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="近12月收支趋势" size="small">
            {(trendData?.length ?? 0) > 0 ? (
              <ReactECharts option={lineOption} style={{ height: 280 }} />
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
