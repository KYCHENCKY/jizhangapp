# Statistics Page Enhancement Design

## Goal
Add 3 features to StatisticsPage: expense calendar, category ranking list, and drill-down period ranking.

## Features

### 1. Expense Calendar (支出日历)
- **Data**: New API `GET /statistics/daily?year=&month=&direction=expense` — returns daily aggregated amounts
- **UI**: ECharts calendar heatmap (left) + daily bar chart (below). Month picker with prev/next arrows
- **Interaction**: Click a day → filter transaction table below by that date

### 2. Category Expense Ranking (分类支出排行榜)
- **Data**: Reuses existing `GET /statistics/by-category?direction=expense`
- **UI**: Ranked list below/next to pie chart. Each row: rank (#1-#3 gold/silver/bronze), category name + color dot, amount, percentage, progress bar
- **Interaction**: Click a row → pie chart highlights + transaction table filters by that category, sorted by amount desc

### 3. Period Ranking Drill-down
- When a category is selected (from ranking or pie chart), transaction table auto-filters: `category_id=X`, sorted by amount descending
- Table title changes to `"{category_name}" 明细排行`

## Layout
```
[Controls]
[Summary Cards]
[Bar Chart (14)] [Calendar (10)]
[Pie Chart (10)] [Ranking List (14)]
[Trend Line (24)]
[Transaction Table (24)]
```

## Backend Changes
- New `get_daily()` in `statistics_service.py` — group by day within a month
- New `GET /statistics/daily` endpoint — accepts year, month, direction

## Frontend Changes
- `StatisticsPage.tsx` — restructure layout, add calendar, ranking list, drill-down logic
- `api/statistics.ts` — add `fetchDaily()` 
- `hooks/useStatistics.ts` — add `useDaily()` hook
- `types/index.ts` — add `DailyStat` interface
