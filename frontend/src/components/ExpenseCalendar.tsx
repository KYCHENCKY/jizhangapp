import { useMemo } from "react";
import { Card, Button, Space } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { DailyStat } from "../types";

interface Props {
  dailyData: DailyStat[];
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  onDayClick: (date: string) => void;
  direction: "expense" | "income";
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function fmt(amount: number): string {
  if (amount === 0) return "";
  if (amount >= 10000) return (amount / 10000).toFixed(1) + "万";
  if (amount >= 1000) return (amount / 1000).toFixed(1) + "k";
  return amount.toFixed(0);
}

export default function ExpenseCalendar({ dailyData, year, month, onMonthChange, onDayClick, direction }: Props) {
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const goPrev = () => {
    const d = dayjs(monthStr).subtract(1, "month");
    onMonthChange(d.year(), d.month() + 1);
  };

  const goNext = () => {
    const d = dayjs(monthStr).add(1, "month");
    onMonthChange(d.year(), d.month() + 1);
  };

  const dataMap = useMemo(() => {
    const m: Record<string, DailyStat> = {};
    dailyData.forEach((d) => { m[d.date] = d; });
    return m;
  }, [dailyData]);

  const maxVal = useMemo(
    () => dailyData.reduce((m, d) => Math.max(m, direction === "expense" ? d.expense : d.income), 0),
    [dailyData, direction],
  );

  const isIncome = direction === "income";
  const dirLabel = isIncome ? "收入" : "支出";

  // Build calendar grid
  const weeks = useMemo(() => {
    const firstDay = dayjs(monthStr).startOf("month");
    const startDow = (firstDay.day() + 6) % 7;

    const cells: { day: number; date: string | null; inMonth: boolean }[][] = [];
    let current = firstDay;

    // Week 1
    const week1: typeof cells[0] = [];
    for (let i = 0; i < startDow; i++) {
      week1.push({ day: 0, date: null, inMonth: false });
    }
    while (current.month() + 1 === month && week1.length < 7) {
      week1.push({ day: current.date(), date: current.format("YYYY-MM-DD"), inMonth: true });
      current = current.add(1, "day");
    }
    while (week1.length < 7) {
      week1.push({ day: 0, date: null, inMonth: false });
    }
    cells.push(week1);

    while (current.month() + 1 === month) {
      const week: typeof cells[0] = [];
      for (let i = 0; i < 7; i++) {
        if (current.month() + 1 === month) {
          week.push({ day: current.date(), date: current.format("YYYY-MM-DD"), inMonth: true });
          current = current.add(1, "day");
        } else {
          week.push({ day: 0, date: null, inMonth: false });
        }
      }
      cells.push(week);
    }

    return cells;
  }, [monthStr, month, year]);

  function cellBg(expense: number, income: number): string {
    const v = isIncome ? income : expense;
    if (v <= 0) return "#fafafa";
    const ratio = maxVal > 0 ? Math.min(v / maxVal, 1) : 0;
    if (ratio < 0.2) return isIncome ? "#f0fff4" : "#fff8f5";
    if (ratio < 0.4) return isIncome ? "#c6f6d5" : "#ffe0d0";
    if (ratio < 0.6) return isIncome ? "#9ae6b4" : "#ffb499";
    if (ratio < 0.8) return isIncome ? "#68d391" : "#ff855e";
    return isIncome ? "#38a169" : "#e07060";
  }

  function cellTextColor(expense: number, income: number): string {
    const v = isIncome ? income : expense;
    if (v <= 0) return "#4a3728";
    const ratio = maxVal > 0 ? Math.min(v / maxVal, 1) : 0;
    return ratio > 0.6 ? "#fff" : "#4a3728";
  }

  return (
    <Card
      title={
        <Space>
          <Button type="text" size="small" icon={<LeftOutlined />} onClick={goPrev} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>{monthStr}</span>
          <Button type="text" size="small" icon={<RightOutlined />} onClick={goNext} />
        </Space>
      }
      size="small"
      extra={
        <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#8c7568" }}>
          <span>低</span>
          {[0.2, 0.45, 0.7, 0.9].map((r, i) => (
            <div key={i} style={{
              width: 12, height: 9, borderRadius: 2,
              background: cellBg(maxVal * r, maxVal * r),
              border: "1px solid #eee",
            }} />
          ))}
          <span>高</span>
        </div>
      }
    >
      {/* Weekday header */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
        gap: 2, marginBottom: 3, textAlign: "center",
        fontSize: 11, color: "#8c7568", fontWeight: 500,
      }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ padding: "2px 0" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2,
          }}>
            {week.map((cell, ci) => {
              const d = cell.date ? dataMap[cell.date] : null;
              const exp = d?.expense ?? 0;
              const inc = d?.income ?? 0;
              const bg = cell.inMonth ? cellBg(exp, inc) : "transparent";
              const txtCol = cell.inMonth ? cellTextColor(exp, inc) : "#ccc";
              const isToday = cell.date === dayjs().format("YYYY-MM-DD");

              return (
                <div
                  key={ci}
                  onClick={() => {
                    if (cell.date && cell.inMonth) onDayClick(cell.date);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    background: bg,
                    cursor: cell.inMonth ? "pointer" : "default",
                    border: isToday ? "2px solid #f0835b" : "2px solid transparent",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    boxShadow: cell.inMonth && (exp > 0 || inc > 0) ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                    minHeight: 48,
                    padding: "2px 1px",
                  }}
                  onMouseEnter={(e) => {
                    if (cell.inMonth) {
                      e.currentTarget.style.transform = "scale(1.06)";
                      e.currentTarget.style.boxShadow = "0 3px 12px rgba(240,131,91,0.18)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = cell.inMonth && (exp > 0 || inc > 0) ? "0 1px 3px rgba(0,0,0,0.05)" : "none";
                  }}
                >
                  {cell.inMonth && (
                    <>
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: isToday ? "#f0835b" : txtCol,
                        lineHeight: 1.2,
                      }}>
                        {cell.day}
                      </span>
                      {(() => {
                        const amt = isIncome ? (d?.income ?? 0) : (d?.expense ?? 0);
                        if (d && amt > 0) {
                          return (
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              color: txtCol === "#fff" ? "rgba(255,255,255,0.85)" : (isIncome ? "#38a169" : "#e07060"),
                              lineHeight: 1.3,
                            }}>
                              {isIncome ? "收" : "支"}{fmt(amt)}
                            </span>
                          );
                        }
                        return <span style={{ fontSize: 9, color: "#ccc", lineHeight: 1.3 }}>-</span>;
                      })()}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}
