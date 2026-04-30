import { useState } from "react";
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, Space, message, Tabs, Card, ColorPicker, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { Color } from "antd/es/color-picker";

import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useRules, useAddRule, useDeleteRule, useApplyAllRules } from "../hooks/useCategories";
import type { Category } from "../types";

const PRESET_COLORS = [
  "#f0835b", "#e07060", "#ff4d4f", "#ff7a45", "#ffa940", "#ffc53d", "#ffec3d",
  "#52c41a", "#73d13d", "#38a169", "#3eaf7c", "#36cfc9", "#0ea5e9", "#1677ff",
  "#597ef7", "#2f54eb", "#7c3aed", "#a855f7", "#9254de", "#c084fc",
  "#eb2f96", "#f06292", "#f7b731", "#e8961e", "#fa8c16", "#faad14",
  "#8c8c8c", "#bfbfbf", "#9ca3af", "#6b7280", "#4a3728",
];

const EMOJI_OPTIONS: { emoji: string; label: string }[] = [
  // 餐饮
  { emoji: "🍜", label: "面条/中餐" }, { emoji: "🍚", label: "米饭/简餐" },
  { emoji: "🍕", label: "披萨/西餐" }, { emoji: "🍔", label: "汉堡/快餐" },
  { emoji: "🍣", label: "寿司/日料" }, { emoji: "🥘", label: "火锅/大餐" },
  { emoji: "🍰", label: "蛋糕/甜品" }, { emoji: "☕", label: "咖啡/奶茶" },
  { emoji: "🍺", label: "酒水/酒吧" }, { emoji: "🍞", label: "面包/烘焙" },
  { emoji: "🥗", label: "轻食/沙拉" }, { emoji: "🌮", label: "小吃/零食" },
  // 交通
  { emoji: "🚗", label: "汽车/自驾" }, { emoji: "🚌", label: "公交/大巴" },
  { emoji: "🚇", label: "地铁/轨道" }, { emoji: "🚲", label: "单车/骑行" },
  { emoji: "✈️", label: "机票/飞行" }, { emoji: "🚢", label: "船票/轮渡" },
  { emoji: "🚕", label: "出租/网约车" }, { emoji: "🛵", label: "电瓶车/摩托" },
  { emoji: "⛽", label: "加油/充电" }, { emoji: "🅿️", label: "停车/过路" },
  // 购物
  { emoji: "🛒", label: "超市/购物" }, { emoji: "🛍️", label: "百货/商场" },
  { emoji: "👗", label: "服装/穿搭" }, { emoji: "👟", label: "鞋靴/箱包" },
  { emoji: "👜", label: "包包/配饰" }, { emoji: "📦", label: "快递/物流" },
  // 居家
  { emoji: "🏠", label: "房租/房贷" }, { emoji: "🏡", label: "物业/别墅" },
  { emoji: "🛋️", label: "家具/家居" }, { emoji: "🛏️", label: "家纺/床品" },
  { emoji: "🚿", label: "卫浴/洁具" }, { emoji: "💡", label: "灯具/照明" },
  { emoji: "🔌", label: "家电/插电" }, { emoji: "🧹", label: "保洁/家政" },
  // 能源通讯
  { emoji: "⚡", label: "电费/能源" }, { emoji: "💧", label: "水费/燃气" },
  { emoji: "📶", label: "话费/网络" }, { emoji: "📱", label: "手机/通讯" },
  // 娱乐
  { emoji: "🎉", label: "聚会/派对" }, { emoji: "🎬", label: "电影/影院" },
  { emoji: "🎵", label: "音乐/音频" }, { emoji: "🎮", label: "游戏/电竞" },
  { emoji: "🎪", label: "演出/展览" }, { emoji: "🌍", label: "旅行/旅游" },
  { emoji: "🏨", label: "酒店/民宿" }, { emoji: "🎲", label: "棋牌/桌游" },
  // 医疗
  { emoji: "💊", label: "药品/医药" }, { emoji: "🏥", label: "医院/门诊" },
  { emoji: "🩺", label: "体检/检查" }, { emoji: "🦷", label: "牙科/口腔" },
  { emoji: "👁️", label: "眼科/视力" },
  // 教育
  { emoji: "📚", label: "书籍/教材" }, { emoji: "✏️", label: "文具/办公" },
  { emoji: "🎓", label: "学费/培训" }, { emoji: "🖊️", label: "考试/证书" },
  // 美容
  { emoji: "💄", label: "化妆/彩妆" }, { emoji: "💅", label: "美甲/美睫" },
  { emoji: "💇", label: "理发/美发" }, { emoji: "🧴", label: "护肤/保养" },
  // 数码
  { emoji: "💻", label: "电脑/笔记本" }, { emoji: "🖥️", label: "台式机/组装" },
  { emoji: "📷", label: "相机/摄影" }, { emoji: "🎧", label: "耳机/音箱" },
  // 汽车
  { emoji: "🔧", label: "维修/保养" }, { emoji: "🏍️", label: "摩托车" },
  { emoji: "🧰", label: "车品/配件" },
  // 运动
  { emoji: "🏃", label: "跑步/健身" }, { emoji: "🏊", label: "游泳/水上" },
  { emoji: "⚽", label: "足球/球类" }, { emoji: "🏀", label: "篮球" },
  { emoji: "🎾", label: "网球/小球" }, { emoji: "🧘", label: "瑜伽/冥想" },
  // 宠物
  { emoji: "🐶", label: "狗狗" }, { emoji: "🐱", label: "猫咪" },
  { emoji: "🐾", label: "宠物用品" }, { emoji: "🐠", label: "鱼/水族" },
  // 人情
  { emoji: "🎁", label: "送礼/礼物" }, { emoji: "💐", label: "鲜花/花束" },
  { emoji: "🧧", label: "红包/礼金" }, { emoji: "🎀", label: "庆祝/纪念" },
  // 收入
  { emoji: "💰", label: "工资/薪水" }, { emoji: "🏆", label: "奖金/奖励" },
  { emoji: "💼", label: "兼职/副业" }, { emoji: "📈", label: "股票/投资" },
  { emoji: "💹", label: "利息/收益" }, { emoji: "💸", label: "转账/收款" },
  { emoji: "📋", label: "报销/补贴" }, { emoji: "↩️", label: "退款/返利" },
  { emoji: "🪙", label: "零钱/硬币" }, { emoji: "💎", label: "贵重物品" },
  // 金融
  { emoji: "💳", label: "信用卡" }, { emoji: "🏦", label: "银行/储蓄" },
  { emoji: "📊", label: "理财/基金" }, { emoji: "🔄", label: "转账/汇款" },
  // 其他
  { emoji: "🔍", label: "杂项/待分类" }, { emoji: "⭐", label: "收藏/重要" },
  { emoji: "❓", label: "未知/其他" }, { emoji: "📌", label: "标记/备忘" },
];

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
    form.setFieldsValue({ ...cat });
    setModalOpen(true);
  };

  const openCreate = (type: "income" | "expense" | "ignore") => {
    setEditingCat(null);
    form.resetFields();
    form.setFieldsValue({ type, color: "#1677ff", icon: "❓" });
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
            width: 32, height: 32, borderRadius: 10,
            background: `${r.color}18`,
            fontSize: 18,
            flexShrink: 0,
            lineHeight: 1,
          }}>
            {r.icon && r.icon.length <= 4 ? r.icon : "❓"}
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
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            cursor: "default",
          }} />
        </Tooltip>
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
                <div key={rule.id} style={{
                  display: "flex", alignItems: "center", padding: "10px 16px",
                  background: "#fffdf9", borderRadius: 12, border: "1px solid #f0e4d8",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}>
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
              <div style={{ color: "#8c7568", fontSize: 14 }}>暂无自动分类规则</div>
              <div style={{ color: "#8c7568", fontSize: 12, marginTop: 4 }}>添加规则后可自动为新导入的交易匹配分类</div>
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
            <Button type="primary" loading={applyAllRulesMutation.isPending}
              onClick={() => applyAllRulesMutation.mutate(undefined, {
                onSuccess: (res) => message.success(res.message),
                onError: (err) => message.error(err.message),
              })}>
              应用全部规则
            </Button>
          </Space>
        }
        onChange={() => setSelectedCat(null)}
        items={[
          { key: "expense", label: "支出分类", children: renderTabContent(expenseCats, "#f0835b") },
          { key: "income", label: "收入分类", children: renderTabContent(incomeCats, "#38a169") },
          { key: "ignore", label: "不计收支", children: renderTabContent(ignoreCats, "#8c8c8c") },
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
            <ColorPicker showText format="hex"
              presets={[{ label: "推荐颜色", colors: PRESET_COLORS }]}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              maxHeight: 200,
              overflow: "auto",
            }}>
              {EMOJI_OPTIONS.map((opt) => {
                const isSelected = form.getFieldValue("icon") === opt.emoji;
                return (
                  <Tooltip key={opt.emoji} title={opt.label}>
                    <div
                      onClick={() => form.setFieldValue("icon", opt.emoji)}
                      style={{
                        width: 44, height: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontSize: 24,
                        lineHeight: 1,
                        border: isSelected ? "2px solid #f0835b" : "2px solid transparent",
                        background: isSelected ? "#fef3ed" : "#fafafa",
                        transition: "all 0.15s ease",
                        flexShrink: 0,
                      }}
                    >
                      {opt.emoji}
                    </div>
                  </Tooltip>
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
