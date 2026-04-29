import { useState } from "react";
import { Card, Button, Modal, Form, Select, InputNumber, Segmented, Tag, Popconfirm, Switch, Space, message, Row, Col } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget } from "../hooks/useBudgets";
import { useCategories } from "../hooks/useCategories";
import { formatMoney, getCurrentYearMonth } from "../utils/formatters";
import type { Budget } from "../types";

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

export default function BudgetsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [period, setPeriod] = useState<"yearly" | "monthly">("monthly");
  const [form] = Form.useForm();

  const { year, month } = getCurrentYearMonth();
  const queryYear = Form.useWatch("year", form) || year;
  const queryMonth = period === "monthly" ? (Form.useWatch("month", form) || month) : undefined;

  const { data: budgets, isLoading } = useBudgets({ year: queryYear, month: queryMonth });
  const { data: categories } = useCategories();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const expenseCats = categories?.filter((c) => c.type === "expense") ?? [];

  const handleCreate = () => {
    form.validateFields().then((values) => {
      createMutation.mutate(values, {
        onSuccess: () => { message.success("预算创建成功"); setModalOpen(false); form.resetFields(); },
        onError: (err) => message.error(err.message),
      });
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2>预算管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          添加预算
        </Button>
      </div>

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
                styles={{ body: { padding: "20px 24px" } }}
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

      <Modal
        title="添加预算"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ period: "monthly", alert_ratio: 0.8 }}>
          <Form.Item name="category_id" label="分类" rules={[{ required: true, message: "请选择分类" }]}>
            <Select
              showSearch
              placeholder="选择支出分类"
              filterOption={(input, option) => (option?.label as string ?? "").includes(input)}
              options={expenseCats.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="amount" label="预算金额" rules={[{ required: true, message: "请输入金额" }]}>
            <InputNumber min={0} step={100} style={{ width: "100%" }} prefix="¥" placeholder="每月预算金额" />
          </Form.Item>
          <Form.Item name="period" label="周期">
            <Segmented options={[{ value: "monthly", label: "月度" }, { value: "yearly", label: "年度" }]} onChange={(v) => setPeriod(v as "yearly" | "monthly")} />
          </Form.Item>
          <Form.Item name="alert_ratio" label="预警比例">
            <InputNumber min={0} max={1} step={0.1} style={{ width: "100%" }} placeholder="0.8 = 花到80%时提醒" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
