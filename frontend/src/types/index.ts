export interface Category {
  id: number;
  name: string;
  type: "income" | "expense" | "ignore";
  parent_id: number | null;
  icon: string;
  color: string;
  sort_order: number;
  children: Category[];
  transaction_count: number;
}

export interface CategoryRule {
  id: number;
  category_id: number;
  field: "counterparty" | "product_desc" | "transaction_type";
  pattern: string;
  match_mode: "contains" | "exact" | "regex";
  priority: number;
}

export interface Transaction {
  id: number;
  transaction_time: string;
  source_platform: "alipay" | "wechat";
  transaction_type: string;
  counterparty: string;
  product_desc: string;
  direction: "income" | "expense" | "neutral";
  amount: number;
  payment_method: string;
  status: string;
  source_txn_id: string;
  merchant_order: string;
  notes: string;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
}

export interface Budget {
  id: number;
  category_id: number;
  category_name: string;
  category_color: string;
  amount: number;
  period: "yearly" | "monthly" | "weekly";
  year: number | null;
  month: number | null;
  week_start: string | null;
  alert_ratio: number;
  is_active: boolean;
  spent: number;
  spent_ratio: number;
  severity: "ok" | "warning" | "exceeded";
}

export interface ImportBatch {
  id: number;
  filename: string;
  source_platform: string;
  record_count: number;
  new_count: number;
  dup_count: number;
  date_start: string;
  date_end: string;
  imported_at: string;
}

export interface Summary {
  total_income: number;
  total_expense: number;
  net: number;
  transaction_count: number;
}

export interface PeriodStat {
  period_label: string;
  income: number;
  expense: number;
  count: number;
}

export interface CategoryStat {
  category_id: number | null;
  category_name: string;
  category_color: string;
  total_amount: number;
  percentage: number;
  count: number;
}

export interface TrendPoint {
  period: string;
  income: number;
  expense: number;
}

export interface DailyStat {
  date: string;
  income: number;
  expense: number;
  count: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  user: User;
}
