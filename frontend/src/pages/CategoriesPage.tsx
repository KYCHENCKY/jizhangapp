import { useState } from "react";
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, Space, message, Tabs, Card, ColorPicker, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { Color } from "antd/es/color-picker";

import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useRules, useAddRule, useDeleteRule, useApplyAllRules } from "../hooks/useCategories";
import type { Category } from "../types";

// Preset colors for quick selection
const PRESET_COLORS = [
  "#f0835b", "#e07060", "#ff4d4f", "#ff7a45", "#ffa940", "#ffc53d", "#ffec3d",
  "#52c41a", "#73d13d", "#38a169", "#3eaf7c", "#36cfc9", "#0ea5e9", "#1677ff",
  "#597ef7", "#2f54eb", "#7c3aed", "#a855f7", "#9254de", "#c084fc",
  "#eb2f96", "#f06292", "#f7b731", "#e8961e", "#fa8c16", "#faad14",
  "#8c8c8c", "#bfbfbf", "#9ca3af", "#6b7280", "#4a3728",
];

// Common icons with Chinese labels
const ICON_OPTIONS: { icon: string; label: string; keywords: string[] }[] = [
  { icon: "CoffeeOutlined", label: "咖啡/餐饮", keywords: ["food", "drink", "餐", "饮"] },
  { icon: "ShoppingOutlined", label: "购物/消费", keywords: ["shop", "buy", "购", "买"] },
  { icon: "CarOutlined", label: "汽车/出行", keywords: ["car", "transport", "车", "行"] },
  { icon: "HomeOutlined", label: "住房/居家", keywords: ["home", "house", "家", "房"] },
  { icon: "ThunderboltOutlined", label: "水电/能源", keywords: ["power", "energy", "电", "水"] },
  { icon: "WifiOutlined", label: "通讯/网络", keywords: ["wifi", "phone", "网", "话"] },
  { icon: "SmileOutlined", label: "娱乐/休闲", keywords: ["fun", "play", "玩", "乐"] },
  { icon: "HeartOutlined", label: "医疗/健康", keywords: ["health", "medical", "医", "药"] },
  { icon: "ReadOutlined", label: "教育/学习", keywords: ["edu", "book", "学", "书"] },
  { icon: "SkinOutlined", label: "美容/服饰", keywords: ["beauty", "fashion", "美", "衣"] },
  { icon: "InboxOutlined", label: "日用/百货", keywords: ["daily", "goods", "日", "杂"] },
  { icon: "LaptopOutlined", label: "数码/电器", keywords: ["digital", "tech", "电", "数"] },
  { icon: "ToolOutlined", label: "维修/养护", keywords: ["repair", "maintain", "修", "养"] },
  { icon: "DollarOutlined", label: "工资/收入", keywords: ["salary", "income", "薪", "收"] },
  { icon: "TrophyOutlined", label: "奖金/绩效", keywords: ["bonus", "award", "奖", "绩"] },
  { icon: "RiseOutlined", label: "投资/理财", keywords: ["invest", "stock", "投", "理"] },
  { icon: "PercentageOutlined", label: "利息/收益", keywords: ["interest", "yield", "息", "利"] },
  { icon: "GiftOutlined", label: "红包/礼金", keywords: ["gift", "redpacket", "礼", "红"] },
  { icon: "ReloadOutlined", label: "退款/返利", keywords: ["refund", "rebate", "退", "返"] },
  { icon: "FileTextOutlined", label: "报销/补贴", keywords: ["reimburse", "subsidy", "报", "补"] },
  { icon: "SendOutlined", label: "转账/汇款", keywords: ["transfer", "remit", "转", "汇"] },
  { icon: "WalletOutlined", label: "钱包/账户", keywords: ["wallet", "account", "钱", "账"] },
  { icon: "CreditCardOutlined", label: "信用卡/还款", keywords: ["credit", "card", "信", "还"] },
  { icon: "BankOutlined", label: "银行/存取", keywords: ["bank", "deposit", "银", "存"] },
  { icon: "SwapOutlined", label: "转账/互换", keywords: ["swap", "exchange", "换", "互"] },
  { icon: "AccountBookOutlined", label: "记账/账本", keywords: ["book", "ledger", "账", "记"] },
  { icon: "TeamOutlined", label: "人情/往来", keywords: ["social", "people", "人", "情"] },
  { icon: "ShopOutlined", label: "商铺/店铺", keywords: ["store", "shop", "店", "铺"] },
  { icon: "FundOutlined", label: "基金/理财", keywords: ["fund", "finance", "基", "财"] },
  { icon: "InsuranceOutlined", label: "保险/保障", keywords: ["insurance", "安全", "保"] },
  { icon: "EnvironmentOutlined", label: "出行/户外", keywords: ["outdoor", "travel", "旅", "外"] },
  { icon: "BookOutlined", label: "书籍/知识", keywords: ["book", "knowledge", "书", "知"] },
  { icon: "CustomerServiceOutlined", label: "客服/服务", keywords: ["service", "support", "服", "客"] },
  { icon: "EllipsisOutlined", label: "其他/杂项", keywords: ["other", "misc", "其", "杂"] },
];

// Dynamically import icons — we use a registry to resolve icon names to components
const ICON_REGISTRY: Record<string, React.ReactNode> = {};

function IconPreview({ iconName, size = 20 }: { iconName: string; size?: number }) {
  // We render a small colored circle with the first letter as a fallback
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: "50%",
      background: "#f0835b",
      color: "#fff",
      fontSize: size * 0.55,
      fontWeight: 700,
    }}>
      {iconName.charAt(0).toUpperCase()}
    </span>
  );
}

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
      // ColorPicker returns a Color object, convert to hex string
      const payload = {
        ...values,
        color: typeof values.color === "string" ? values.color : values.color?.toHexString?.() ?? "#1677ff",
      };
      if (editingCat) {
        updateMutation.mutate({ id: editingCat.id, ...payload }, {
          onSuccess: () => { message.success("更新成功"); setModalOpen(false); },
          onError: (err) => message.error(err.message),
        });
      } else {
        createMutation.mutate(payload, {
          onSuccess: () => { message.success("创建成功"); setModalOpen(false); form.resetFields(); },
          onError: (err) => message.error(err.message),
        });
      }
    });
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    form.setFieldsValue({
      ...cat,
      color: cat.color, // ColorPicker can handle hex strings
    });
    setModalOpen(true);
  };

  const openCreate = (type: "income" | "expense" | "ignore") => {
    setEditingCat(null);
    form.resetFields();
    form.setFieldsValue({ type, color: "#1677ff", icon: "WalletOutlined" });
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
      title: "名称", dataIndex: "name", width: 160,
      render: (v: string, r: Category) => (
        <Space>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28, height: 28, borderRadius: 8,
            background: r.color,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {r.icon ? r.icon?.replace("Outlined", "").replace("Filled", "").replace("TwoTone", "").charAt(0) : v.charAt(0)}
          </span>
          <span style={{ fontWeight: 500 }}>{v}</span>
        </Space>
      ),
    },
    {
      title: "颜色", dataIndex: "color", width: 60,
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{
            display: "inline-block",
            width: 28, height: 28, borderRadius: 8,
            background: v,
            border: "1px solid rgba(0,0,0,0.1)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            cursor: "default",
          }} />
        </Tooltip>
      ),
    },
    {
      title: "图标", dataIndex: "icon", width: 60,
      render: (v: string) => {
        const opt = ICON_OPTIONS.find(o => o.icon === v);
        return (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28, height: 28, borderRadius: 8,
            background: "#fef3ed",
            color: "#f0835b",
            fontSize: 12,
            fontWeight: 500,
          }}>
            {opt ? opt.label : (v || "").replace("Outlined", "").replace("Filled", "").replace("TwoTone", "")}
          </span>
        );
      },
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
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: "请输入分类名称" }]}>
            <Input placeholder="如：餐饮美食" />
          </Form.Item>
          <Form.Item name="type" label="类型" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="color" label="颜色" rules={[{ required: true, message: "请选择颜色" }]}
            getValueFromEvent={(c: Color) => c?.toHexString?.() ?? c}
            getValueProps={(v: string) => ({ value: v })}
          >
            <ColorPicker
              showText
              format="hex"
              presets={[
                { label: "推荐颜色", colors: PRESET_COLORS },
              ]}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: 6,
              maxHeight: 240,
              overflow: "auto",
              padding: 4,
            }}>
              {ICON_OPTIONS.map((opt) => {
                const isSelected = form.getFieldValue("icon") === opt.icon;
                return (
                  <div
                    key={opt.icon}
                    onClick={() => form.setFieldValue("icon", opt.icon)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      padding: "8px 4px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: isSelected ? "2px solid #f0835b" : "2px solid transparent",
                      background: isSelected ? "#fef3ed" : "#fafafa",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "#f5f5f5";
                        e.currentTarget.style.borderColor = "#e0e0e0";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "#fafafa";
                        e.currentTarget.style.borderColor = "transparent";
                      }
                    }}
                  >
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32, height: 32, borderRadius: 8,
                      background: isSelected ? "#f0835b" : "#e8e8e8",
                      color: isSelected ? "#fff" : "#666",
                      fontSize: 12,
                      fontWeight: 600,
                      transition: "all 0.2s ease",
                    }}>
                      {opt.label.charAt(0)}
                    </span>
                    <span style={{ fontSize: 10, color: "#8c7568", textAlign: "center", lineHeight: 1.1 }}>
                      {opt.label}
                    </span>
                  </div>
                );
              })}
            </div>
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
