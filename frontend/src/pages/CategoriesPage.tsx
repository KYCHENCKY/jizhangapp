import { useState } from "react";
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, Space, message, Tabs, Card } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";

import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useRules, useAddRule, useDeleteRule, useApplyAllRules } from "../hooks/useCategories";
import type { Category } from "../types";

export default function CategoriesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [ruleForm] = Form.useForm();

  const { data: categories } = useCategories();
  const { data: rules, refetch: refetchRules } = useRules(selectedCat?.id ?? null);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const addRuleMutation = useAddRule();
  const deleteRuleMutation = useDeleteRule();
  const applyAllRulesMutation = useApplyAllRules();

  const incomeCats = categories?.filter((c) => c.type === "income") ?? [];
  const expenseCats = categories?.filter((c) => c.type === "expense") ?? [];
  const ignoreCats = categories?.filter((c) => c.type === "ignore") ?? [];

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (editingCat) {
        updateMutation.mutate({ id: editingCat.id, ...values }, {
          onSuccess: () => { message.success("更新成功"); setModalOpen(false); },
          onError: (err) => message.error(err.message),
        });
      } else {
        createMutation.mutate(values, {
          onSuccess: () => { message.success("创建成功"); setModalOpen(false); form.resetFields(); },
          onError: (err) => message.error(err.message),
        });
      }
    });
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    form.setFieldsValue(cat);
    setModalOpen(true);
  };

  const openCreate = (type: "income" | "expense" | "ignore") => {
    setEditingCat(null);
    form.resetFields();
    form.setFieldsValue({ type, color: "#1677ff" });
    setModalOpen(true);
  };

  const handleAddRule = () => {
    if (!selectedCat) return;
    ruleForm.validateFields().then((values) => {
      addRuleMutation.mutate({ categoryId: selectedCat.id, ...values }, {
        onSuccess: () => { message.success("规则已添加"); ruleForm.resetFields(); refetchRules(); },
        onError: (err) => message.error(err.message),
      });
    });
  };

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

  const renderTabContent = (cats: Category[], highlightColor: string) => (
    <div>
      <Table
        columns={catColumns}
        dataSource={cats}
        rowKey="id"
        size="small"
        pagination={false}
        onRow={(r) => ({
          onClick: () => setSelectedCat(r),
          style: {
            background: selectedCat?.id === r.id ? `${highlightColor}10` : undefined,
            borderLeft: selectedCat?.id === r.id ? `3px solid ${highlightColor}` : "3px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s ease",
          },
        })}
      />
      {selectedCat && cats.some((c) => c.id === selectedCat.id) && (
        <Card title={`"${selectedCat.name}" 的自动分类规则`} size="small" style={{ marginTop: 16 }}
          extra={<Button type="primary" size="small" onClick={() => setRuleModalOpen(true)}>添加规则</Button>}>
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
        </Card>
      )}
    </div>
  );

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>分类管理</h2>

      <Tabs
        tabBarExtraContent={
          <Space wrap>
            <Button icon={<PlusOutlined />} onClick={() => openCreate("income")}>添加收入分类</Button>
            <Button icon={<PlusOutlined />} onClick={() => openCreate("expense")}>添加支出分类</Button>
            <Button icon={<PlusOutlined />} onClick={() => openCreate("ignore")}>添加不计收支分类</Button>
            <Button
              type="primary"
              loading={applyAllRulesMutation.isPending}
              onClick={() => {
                applyAllRulesMutation.mutate(undefined, {
                  onSuccess: (res) => message.success(res.message),
                  onError: (err) => message.error(err.message),
                });
              }}
            >
              应用全部规则
            </Button>
          </Space>
        }
        onChange={() => setSelectedCat(null)}
        items={[
          {
            key: "expense",
            label: "支出分类",
            children: renderTabContent(expenseCats, "#f0835b"),
          },
          {
            key: "income",
            label: "收入分类",
            children: renderTabContent(incomeCats, "#38a169"),
          },
          {
            key: "ignore",
            label: "不计收支",
            children: renderTabContent(ignoreCats, "#8c8c8c"),
          },
        ]}
      />

      <Modal
        title={editingCat ? "编辑分类" : "添加分类"}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入分类名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="color" label="颜色">
            <Input />
          </Form.Item>
          <Form.Item name="icon" label="图标名称">
            <Input placeholder="如 CoffeeOutlined" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加分类规则"
        open={ruleModalOpen}
        onOk={handleAddRule}
        onCancel={() => setRuleModalOpen(false)}
        destroyOnClose
      >
        <Form form={ruleForm} layout="vertical" initialValues={{ match_mode: "contains", field: "counterparty" }}>
          <Form.Item name="field" label="匹配字段">
            <Select options={[
              { value: "counterparty", label: "交易对方" },
              { value: "product_desc", label: "商品说明" },
              { value: "transaction_type", label: "交易类型" },
            ]} />
          </Form.Item>
          <Form.Item name="pattern" label="关键词" rules={[{ required: true, message: "请输入关键词" }]}>
            <Input placeholder="如：美团" />
          </Form.Item>
          <Form.Item name="match_mode" label="匹配模式">
            <Select options={[
              { value: "contains", label: "包含" },
              { value: "exact", label: "精确匹配" },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
