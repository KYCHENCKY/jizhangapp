import { Card, Empty } from "antd";
import type { CategoryStat } from "../types";
import { formatMoney } from "../utils/formatters";

interface Props {
  catData: CategoryStat[];
  selectedCategory: number | null;
  onSelect: (catId: number | null) => void;
  totalExpense: number;
  title?: string;
}

export default function CategoryRanking({ catData, selectedCategory, onSelect, totalExpense, title = "分类支出排行" }: Props) {
  if (!catData || catData.length === 0) {
    return (
      <Card title={title} size="small">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  const rankColors = ["#f5a623", "#a0a0a0", "#cd7f32"];

  return (
    <Card title={title} size="small">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {catData.map((cat, i) => {
          const isSelected = selectedCategory === cat.category_id;
          return (
            <div
              key={cat.category_id ?? `null-${i}`}
              onClick={() => {
                if (cat.category_id === null) return;
                onSelect(isSelected ? null : cat.category_id);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 12,
                cursor: cat.category_id ? "pointer" : "default",
                background: isSelected ? "#fef3ed" : "#fffdf9",
                border: isSelected ? "1px solid #f0835b" : "1px solid #f0e4d8",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: i < 3 ? rankColors[i] : "#f5f5f5",
                color: i < 3 ? "#fff" : "#8c8c8c",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {i + 1}
              </div>

              <div style={{ width: 80, flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                  background: cat.category_color, flexShrink: 0,
                }} />
                <span style={{
                  fontWeight: 500, fontSize: 13, color: "#4a3728",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {cat.category_icon} {cat.category_name}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 60 }}>
                <div style={{
                  height: 8, borderRadius: 4, background: "#f5f5f5", overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 4,
                    width: `${Math.min(cat.percentage, 100)}%`,
                    background: cat.category_color,
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>

              <div style={{ width: 80, textAlign: "right", flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#4a3728" }}>
                  {formatMoney(cat.total_amount)}
                </span>
              </div>

              <div style={{ width: 45, textAlign: "right", flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: "#8c7568" }}>
                  {cat.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
