# Statistics Page Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add expense calendar heatmap, category expense ranking list, and drill-down period ranking to StatisticsPage.

**Architecture:** Backend adds a daily aggregation endpoint; frontend adds ECharts calendar heatmap, a custom ranking list component below the pie chart, and drill-down interaction via selectedCategory state that already exists.

**Tech Stack:** Python FastAPI + SQLAlchemy (backend), React + TypeScript + Ant Design + ECharts (frontend)

---

### Task 1: Backend — Daily aggregation service

**Files:**
- Modify: `backend/app/services/statistics_service.py` (append new function)
- Modify: `backend/app/schemas.py` (append DailyStat class)
- Modify: `backend/app/routers/statistics.py` (append daily endpoint)

- [ ] **Step 1: Add DailyStat schema**

In `backend/app/schemas.py`, after the `TrendPoint` class (line 186), add:

```python
class DailyStat(BaseModel):
    date: str
    income: float = 0
    expense: float = 0
    count: int = 0
```

- [ ] **Step 2: Add get_daily function to statistics_service.py**

In `backend/app/services/statistics_service.py`, append after `get_trend()`:

```python
def get_daily(
    db: Session,
    year: int,
    month: int,
    direction: str | None = None,
    source_platform: str | None = None,
) -> list[dict]:
    q = db.query(
        func.strftime("%Y-%m-%d", Transaction.transaction_time).label("date"),
        func.coalesce(func.sum(
            case((Transaction.direction == "income", Transaction.amount), else_=0)
        ), 0).label("income"),
        func.coalesce(func.sum(
            case((Transaction.direction == "expense", Transaction.amount), else_=0)
        ), 0).label("expense"),
        func.count(Transaction.id).label("count"),
    ).filter(
        func.strftime("%Y", Transaction.transaction_time) == str(year),
        func.strftime("%m", Transaction.transaction_time) == f"{month:02d}",
    )

    q = _apply_filters(q, source_platform=source_platform)
    if direction:
        q = q.filter(Transaction.direction == direction)

    q = q.group_by("date").order_by("date")

    return [
        {
            "date": row.date,
            "income": round(float(row.income), 2),
            "expense": round(float(row.expense), 2),
            "count": row.count,
        }
        for row in q.all()
    ]
```

- [ ] **Step 3: Add daily endpoint to statistics router**

In `backend/app/routers/statistics.py`, update imports and append endpoint:

Update import line 7:
```python
from ..services.statistics_service import get_summary, get_by_period, get_by_category, get_trend, get_daily
```

Append after the trend endpoint (before end of file):
```python
@router.get("/daily")
def daily(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    direction: str | None = None,
    source_platform: str | None = None,
    db: Session = Depends(get_db),
):
    return ApiResponse(data=get_daily(db, year, month, direction, source_platform))
```

- [ ] **Step 4: Test the new endpoint**

Run backend and test:
```bash
curl "http://localhost:8000/api/statistics/daily?year=2026&month=4"
```

Expected: JSON with `success: true` and `data` array of daily stats.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/statistics_service.py backend/app/schemas.py backend/app/routers/statistics.py
git commit -m "feat: add daily aggregation endpoint for statistics"
```

---

### Task 2: Frontend — Types, API, and Hook for daily data

**Files:**
- Modify: `frontend/src/types/index.ts` (append DailyStat)
- Modify: `frontend/src/api/statistics.ts` (append fetchDaily)
- Modify: `frontend/src/hooks/useStatistics.ts` (append useDaily)

- [ ] **Step 1: Add DailyStat type**

In `frontend/src/types/index.ts`, after `TrendPoint` (line 97), add:

```typescript
export interface DailyStat {
  date: string;
  income: number;
  expense: number;
  count: number;
}
```

- [ ] **Step 2: Add fetchDaily API function**

In `frontend/src/api/statistics.ts`, after `fetchTrend` (line 14), add:

```typescript
export const fetchDaily = (params: Record<string, unknown>): Promise<ApiResponse<DailyStat[]>> =>
  client.get("/statistics/daily", { params });
```

Update import line 1 to include `DailyStat`:
```typescript
import type { ApiResponse, Summary, PeriodStat, CategoryStat, TrendPoint, DailyStat } from "../types";
```

- [ ] **Step 3: Add useDaily hook**

In `frontend/src/hooks/useStatistics.ts`, after `useTrend`, add:

```typescript
export function useDaily(params: Record<string, unknown>) {
  return useQuery({
    queryKey: ["daily", params],
    queryFn: () => api.fetchDaily(params).then((r) => r.data),
    enabled: !!params.year && !!params.month,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/statistics.ts frontend/src/hooks/useStatistics.ts
git commit -m "feat: add daily stats types, API, and hook"
```

---

### Task 3: Frontend — Calendar heatmap component

**Files:**
- Create: `frontend/src/components/ExpenseCalendar.tsx`

- [ ] **Step 1: Create ExpenseCalendar component**

This component uses ECharts calendar heatmap. It takes `dailyData`, `year`, `month`, `onMonthChange`, `onDayClick`.

```tsx
import { useMemo } from "react";
import { Card, Button, Space } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import dayjs from "dayjs";
import type { DailyStat } from "../types";
import { formatMoney } from "../utils/formatters";

interface Props {
  dailyData: DailyStat[];
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  onDayClick: (date: string) => void;
}

export default function ExpenseCalendar({ dailyData, year, month, onMonthChange, onDayClick }: Props) {
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const goPrev = () => {
    const d = dayjs(monthStr).subtract(1, "month");
    onMonthChange(d.year(), d.month() + 1);
  };

  const goNext = () => {
    const d = dayjs(monthStr).add(1, "month");
    onMonthChange(d.year(), d.month() + 1);
  };

  const calOption = useMemo(() => {
    // Build heatmap data: [dateStr, amount]
    const heatData = dailyData
      .filter((d) => d.expense > 0)
      .map((d) => [d.date, d.expense]);

    const maxExpense = dailyData.reduce((m, d) => Math.max(m, d.expense), 0);

    return {
      tooltip: {
        formatter: (p: { value: [string, number] }) =>
          `${p.value[0]}<br/>支出: ¥${p.value[1].toFixed(2)}`,
      },
      visualMap: {
        min: 0,
        max: maxExpense || 100,
        type: "piecewise" as const,
        orient: "horizontal" as const,
        left: "center",
        bottom: 0,
        pieces: [
          { min: 0, max: 0, color: "#f5f5f5", label: "0" },
          { min: 0.01, max: maxExpense * 0.25 || 25, color: "#ffe0d0", label: "低" },
          { min: maxExpense * 0.25 || 25, max: maxExpense * 0.5 || 50, color: "#ffb499" },
          { min: maxExpense * 0.5 || 50, max: maxExpense * 0.75 || 75, color: "#ff855e" },
          { min: maxExpense * 0.75 || 75, max: maxExpense || 100, color: "#e07060", label: "高" },
        ],
        textStyle: { color: "#8c7568" },
      },
      calendar: {
        top: "middle",
        left: "center",
        range: monthStr,
        cellSize: [36, 36],
        yearLabel: { show: false },
        monthLabel: { color: "#8c7568" },
        dayLabel: { color: "#8c7568", firstDay: 1 },
        itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
        splitLine: { show: false },
      },
      series: [
        {
          type: "heatmap",
          coordinateSystem: "calendar",
          data: heatData,
          label: {
            show: true,
            formatter: (p: { value: [string, number] }) =>
              dayjs(p.value[0]).date().toString(),
            color: "#4a3728",
            fontSize: 12,
          },
          emphasis: {
            itemStyle: { shadowBlur: 8, shadowColor: "rgba(240,131,91,0.4)" },
          },
        },
      ],
    };
  }, [dailyData, monthStr]);

  return (
    <Card
      title={
        <Space>
          <Button type="text" size="small" icon={<LeftOutlined />} onClick={goPrev} />
          <span style={{ fontWeight: 600 }}>{monthStr}</span>
          <Button type="text" size="small" icon={<RightOutlined />} onClick={goNext} />
        </Space>
      }
      size="small"
      style={{ height: "100%" }}
    >
      <ReactECharts
        option={calOption}
        style={{ height: 260 }}
        onEvents={{
          click: (params: { value: [string, number] }) => {
            if (params.value && params.value[0]) {
              onDayClick(params.value[0]);
            }
          },
        }}
      />
    </Card>
  );
}
```

---

### Task 4: Frontend — Category ranking list component

**Files:**
- Create: `frontend/src/components/CategoryRanking.tsx`

- [ ] **Step 1: Create CategoryRanking component**

This component renders a ranked list below the pie chart.

```tsx
import { Card, Empty } from "antd";
import type { CategoryStat } from "../types";
import { formatMoney } from "../utils/formatters";

interface Props {
  catData: CategoryStat[];
  selectedCategory: number | null;
  onSelect: (catId: number | null) => void;
  totalExpense: number;
}

export default function CategoryRanking({ catData, selectedCategory, onSelect, totalExpense }: Props) {
  if (!catData || catData.length === 0) {
    return (
      <Card title="分类支出排行" size="small">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  const rankColors = ["#f5a623", "#a0a0a0", "#cd7f32"]; // gold, silver, bronze

  return (
    <Card title="分类支出排行" size="small">
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
              {/* Rank badge */}
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: i < 3 ? rankColors[i] : "#f5f5f5",
                color: i < 3 ? "#fff" : "#8c8c8c",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {i + 1}
              </div>

              {/* Color dot + name */}
              <div style={{ width: 80, flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                  background: cat.category_color, flexShrink: 0,
                }} />
                <span style={{ fontWeight: 500, fontSize: 13, color: "#4a3728", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {cat.category_name}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ flex: 1, minWidth: 60 }}>
                <div style={{
                  height: 8, borderRadius: 4, background: "#f5f5f5",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 4,
                    width: `${Math.min(cat.percentage, 100)}%`,
                    background: cat.category_color,
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>

              {/* Amount */}
              <div style={{ width: 80, textAlign: "right", flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#4a3728" }}>
                  {formatMoney(cat.total_amount)}
                </span>
              </div>

              {/* Percentage */}
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
```

---

### Task 5: Frontend — Restructure StatisticsPage layout

**Files:**
- Modify: `frontend/src/pages/StatisticsPage.tsx` (major restructure)

- [ ] **Step 1: Add new state and imports**

Add state for calendar date and daily data query. Add imports for new components.

Update imports (lines 1-13):
```tsx
import { useState, useMemo, useCallback } from "react";
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
```

- [ ] **Step 2: Add calendar state and daily data query**

After `const [txnPage, setTxnPage] = useState(1);` (line 23):

```tsx
  const [calendarYear, setCalendarYear] = useState(dayjs().year());
  const [calendarMonth, setCalendarMonth] = useState(dayjs().month() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  import { useState, useMemo, useEffect, useCallback } from "react";

  // ... in component, after existing state (line 23):
  const [calendarYear, setCalendarYear] = useState(dayjs().year());
  const [calendarMonth, setCalendarMonth] = useState(dayjs().month() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // When granularity is monthly, sync calendar to the main date picker
  useEffect(() => {
    if (granularity === "monthly") {
      setCalendarYear(selectedDate.year());
      setCalendarMonth(selectedDate.month() + 1);
    }
  }, [granularity, selectedDate]);

  // ... existing state continues:
  const [calendarYear, setCalendarYear] = useState(dayjs().year());
  const [calendarMonth, setCalendarMonth] = useState(dayjs().month() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (granularity === "monthly") {
      setCalendarYear(selectedDate.year());
      setCalendarMonth(selectedDate.month() + 1);
    }
  }, [granularity, selectedDate]);
```

- [ ] **Step 3: Add daily data query**

After existing API queries (line 71):

```tsx
  const { data: dailyData } = useDaily({
    year: calendarYear,
    month: calendarMonth,
    direction: "expense",
    ...commonParams,
  });
```

- [ ] **Step 4: Update tableQuery to support date filter and amount sorting**

Replace the existing `tableQuery` (lines 73-85) with:

```tsx
  const tableQuery = useMemo(() => {
    const q: Record<string, unknown> = {
      page: txnPage,
      page_size: 20,
      sort_by: selectedCategory ? "amount" : "transaction_time",
      sort_order: selectedCategory ? "desc" : "desc",
      start_date: selectedDay || dateRange.start_date,
      end_date: selectedDay || dateRange.end_date,
    };
    if (selectedCategory) q.category_id = selectedCategory;
    if (platform !== "all") q.source_platform = platform;
    return q;
  }, [dateRange, selectedCategory, selectedDay, txnPage, platform]);
```

- [ ] **Step 5: Update tableQuery when a day is selected**

Add a handler to clear day selection when category changes:

No change needed — the existing logic works. But add: clicking a category clears the day filter and vice versa:

```tsx
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
```

- [ ] **Step 6: Replace the first chart row layout**

Replace the existing bar+pie row (lines 343-374) with the new layout: bar chart + calendar:

Replace:
```tsx
      {/* Charts */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card title="收支对比" size="small">
            {periodLoading ? <Spin style={{ display: "block", margin: "60px auto" }} /> : (periodData?.length ?? 0) > 0 ? (
              <ReactECharts option={barOption} style={{ height: 320 }} />
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>
        <Col span={10}>
          <Card
            title={`支出分类占比${selectedCategory ? ` - ${catMap[selectedCategory]?.name || ""}` : ""}`}
            size="small"
            extra={selectedCategory ? <Button size="small" onClick={() => setSelectedCategory(null)}>清除筛选</Button> : undefined}
          >
            {(catData?.length ?? 0) > 0 ? (
              <ReactECharts
                option={pieOption}
                style={{ height: 320 }}
                onEvents={{
                  click: (params: { name: string }) => {
                    const found = expenseCats.find((c) => c.name === params.name);
                    if (found) {
                      setSelectedCategory(found.id === selectedCategory ? null : found.id);
                      setTxnPage(1);
                    }
                  },
                }}
              />
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>
      </Row>
```

With:
```tsx
      {/* Row 1: Bar chart + Calendar */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card title="收支对比" size="small">
            {periodLoading ? <Spin style={{ display: "block", margin: "60px auto" }} /> : (periodData?.length ?? 0) > 0 ? (
              <ReactECharts option={barOption} style={{ height: 320 }} />
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>
        <Col span={10}>
          <ExpenseCalendar
            dailyData={dailyData ?? []}
            year={calendarYear}
            month={calendarMonth}
            onMonthChange={(y, m) => { setCalendarYear(y); setCalendarMonth(m); }}
            onDayClick={handleDayClick}
          />
        </Col>
      </Row>
```

- [ ] **Step 7: Add Row 2: Pie chart + Category ranking**

Insert after Row 1:

```tsx
      {/* Row 2: Pie chart + Category ranking */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={10}>
          <Card
            title={`支出分类占比${selectedCategory ? ` - ${catMap[selectedCategory]?.name || ""}` : ""}`}
            size="small"
            extra={selectedCategory ? <Button size="small" onClick={() => handleCategorySelect(null)}>清除筛选</Button> : undefined}
          >
            {(catData?.length ?? 0) > 0 ? (
              <ReactECharts
                option={pieOption}
                style={{ height: 320 }}
                onEvents={{
                  click: (params: { name: string }) => {
                    const found = expenseCats.find((c) => c.name === params.name);
                    if (found) {
                      handleCategorySelect(found.id === selectedCategory ? null : found.id);
                    }
                  },
                }}
              />
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>
        <Col span={14}>
          <CategoryRanking
            catData={catData ?? []}
            selectedCategory={selectedCategory}
            onSelect={handleCategorySelect}
            totalExpense={totalCat}
          />
        </Col>
      </Row>
```

- [ ] **Step 8: Update transaction table title to show drill-down state**

Replace the table Card title block (lines 388-401) with:

```tsx
      {/* Transactions with drill-down info */}
      <Card
        title={
          <Space>
            <span>
              {selectedCategory
                ? `${catMap[selectedCategory]?.name || ""} 支出排行`
                : selectedDay
                  ? `${selectedDay} 交易明细`
                  : `${dateRange.label} 交易明细`}
            </span>
            {(selectedCategory || selectedDay) && (
              <Button size="small" onClick={() => { setSelectedCategory(null); setSelectedDay(null); setTxnPage(1); }}>
                清除筛选
              </Button>
            )}
          </Space>
        }
        size="small"
      >
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/pages/StatisticsPage.tsx frontend/src/components/ExpenseCalendar.tsx frontend/src/components/CategoryRanking.tsx
git commit -m "feat: add expense calendar, category ranking, and drill-down to statistics page"
```

---

### Task 6: Integration test

- [ ] **Step 1: Start backend and verify daily endpoint**

```bash
cd backend && python -m uvicorn app.main:app --reload &
sleep 3
curl "http://localhost:8000/api/statistics/daily?year=2026&month=4"
```

Expected: array of daily stats with date/income/expense/count fields.

- [ ] **Step 2: Start frontend dev server and test visually**

```bash
cd frontend && npm run dev
```

Open browser, navigate to Statistics page:
- Verify calendar heatmap renders
- Verify calendar month navigation works
- Verify clicking a day filters transactions
- Verify category ranking list renders below pie chart
- Verify clicking a ranking row filters transactions by amount desc
- Verify pie chart and ranking are linked (selecting one updates the other)

- [ ] **Step 3: Commit**

```bash
git commit -m "test: verify statistics enhancements work end-to-end"
```
