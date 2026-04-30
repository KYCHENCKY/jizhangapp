import { useState } from "react";
import { Table, DatePicker, Select, Input, Button, Tag, Space, Card, message } from "antd";
import { SearchOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useTransactions, useUpdateTransaction, useDeleteTransaction } from "../hooks/useTransactions";
import { useCategories } from "../hooks/useCategories";
import { formatMoney, formatDateTime } from "../utils/formatters";
import type { Transaction } from "../types";

const { RangePicker } = DatePicker;

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const { data, isLoading } = useTransactions({ page, page_size: pageSize, ...filters });
  const { data: categories } = useCategories();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  const allCats = categories ?? [];

  const handleFilter = (key: string, val: unknown) => {
    const newFilters = { ...filters, [key]: val };
    if (val === undefined || val === null || val === "") {
      delete newFilters[key];
    }
    setFilters(newFilters);
    setPage(1);
  };

  const handleCategoryChange = (txnId: number, categoryId: number | null) => {
    updateMutation.mutate({ id: txnId, category_id: categoryId }, {
      onSuccess: () => message.success("已更新"),
      onError: (err) => message.error(err.message),
    });
  };

  const columns = [
    { title: "时间", dataIndex: "transaction_time", render: (v: string) => formatDateTime(v), width: 150, sorter: true },
    { title: "平台", dataIndex: "source_platform", render: (v: string) => v === "alipay" ? <Tag color="blue">支付宝</Tag> : <Tag color="green">微信</Tag>, width: 80 },
    { title: "类型", dataIndex: "direction", render: (v: string) =>
    v === "income" ? <Tag color="green">收入</Tag> :
    v === "expense" ? <Tag color="red">支出</Tag> :
    <Tag color="default">不计收支</Tag>
  , width: 80 },
    {
      title: "分类", dataIndex: "category_id", width: 140,
      render: (v: number | null, r: Transaction) => (
        <Select
          value={v}
          size="small"
          style={{ width: 120 }}
          placeholder="未分类"
          allowClear
          onChange={(val) => handleCategoryChange(r.id, val)}
          options={allCats.map((c) => ({
            value: c.id,
            label: <span>{c.icon} {c.name}</span>,
          }))}
        />
      ),
    },
    { title: "对方", dataIndex: "counterparty", width: 120 },
    { title: "说明", dataIndex: "product_desc", ellipsis: true },
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
    {
      title: "操作", width: 60,
      render: (_: unknown, r: Transaction) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />}
          onClick={() => deleteMutation.mutate(r.id, { onSuccess: () => message.success("已删除") })} />
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>交易明细</h2>

      <Card
        size="small"
        style={{
          marginBottom: 16,
          borderRadius: 16,
          background: "rgba(255,253,249,0.8)",
          boxShadow: "0 2px 12px rgba(240,131,91,0.05)",
        }}
        styles={{ body: { padding: "12px 20px" } }}
      >
        <Space wrap size="small">
          <RangePicker
          size="small"
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              handleFilter("start_date", dates[0].format("YYYY-MM-DD"));
              handleFilter("end_date", dates[1].format("YYYY-MM-DD"));
            } else {
              handleFilter("start_date", undefined);
              handleFilter("end_date", undefined);
            }
          }}
        />
        <Select
          size="small"
          style={{ width: 100 }}
          placeholder="收支类型"
          allowClear
          onChange={(v) => handleFilter("direction", v)}
          options={[
            { value: "expense", label: "支出" },
            { value: "income", label: "收入" },
            { value: "neutral", label: "不计收支" },
          ]}
        />
        <Select
          size="small"
          style={{ width: 100 }}
          placeholder="平台"
          allowClear
          onChange={(v) => handleFilter("source_platform", v)}
          options={[
            { value: "alipay", label: "支付宝" },
            { value: "wechat", label: "微信" },
          ]}
        />
        <Select
          size="small"
          style={{ width: 140 }}
          placeholder="分类"
          allowClear
          showSearch
          filterOption={(input, option) => (option?.label as string ?? "").includes(input)}
          onChange={(v) => handleFilter("category_id", v)}
          options={allCats.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
        />
        <Input
          size="small"
          style={{ width: 200 }}
          placeholder="搜索对方/商品说明"
          prefix={<SearchOutlined />}
          allowClear
          onChange={(e) => handleFilter("keyword", e.target.value || undefined)}
        />
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={data?.items ?? []}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
