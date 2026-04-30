from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


# ============ Category ============
class CategoryCreate(BaseModel):
    name: str = Field(..., max_length=50)
    type: str = Field(..., pattern="^(income|expense|ignore)$")
    parent_id: Optional[int] = None
    icon: str = ""
    color: str = "#1677ff"
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    parent_id: Optional[int] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    type: str
    parent_id: Optional[int] = None
    icon: str
    color: str
    sort_order: int
    children: list["CategoryOut"] = []
    transaction_count: int = 0

    model_config = {"from_attributes": True}


class CategoryRuleCreate(BaseModel):
    field: str = Field(..., pattern="^(counterparty|product_desc|transaction_type)$")
    pattern: str
    match_mode: str = "contains"
    priority: int = 100


class CategoryRuleOut(BaseModel):
    id: int
    category_id: int
    field: str
    pattern: str
    match_mode: str
    priority: int
    model_config = {"from_attributes": True}


# ============ Transaction ============
class TransactionCreate(BaseModel):
    transaction_time: datetime
    source_platform: str
    transaction_type: str = ""
    counterparty: str = ""
    product_desc: str = ""
    direction: str
    amount: float
    payment_method: str = ""
    status: str = ""
    source_txn_id: str = ""
    merchant_order: str = ""
    notes: str = ""


class TransactionUpdate(BaseModel):
    category_id: Optional[int] = None
    notes: Optional[str] = None


class BatchUpdateRequest(BaseModel):
    ids: list[int]
    category_id: int


class TransactionOut(BaseModel):
    id: int
    transaction_time: datetime
    source_platform: str
    transaction_type: str
    counterparty: str
    product_desc: str
    direction: str
    amount: float
    payment_method: str
    status: str
    source_txn_id: str
    merchant_order: str
    notes: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    model_config = {"from_attributes": True}


# ============ Budget ============
class BudgetCreate(BaseModel):
    category_id: int
    amount: float = Field(..., gt=0)
    period: str = Field(..., pattern="^(yearly|monthly|weekly)$")
    year: Optional[int] = None
    month: Optional[int] = None
    week_start: Optional[str] = None
    alert_ratio: float = Field(0.8, ge=0, le=1.0)
    is_active: bool = True


class BudgetUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    alert_ratio: Optional[float] = Field(None, ge=0, le=1.0)
    is_active: Optional[bool] = None


class BudgetOut(BaseModel):
    id: int
    category_id: int
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    amount: float
    period: str
    year: Optional[int] = None
    month: Optional[int] = None
    week_start: Optional[str] = None
    alert_ratio: float
    is_active: bool
    spent: float = 0
    spent_ratio: float = 0
    severity: str = "ok"
    model_config = {"from_attributes": True}


# ============ Import ============
class ImportBatchOut(BaseModel):
    id: int
    filename: str
    source_platform: str
    record_count: int
    new_count: int
    dup_count: int
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    imported_at: datetime
    model_config = {"from_attributes": True}


class ConfirmImportRequest(BaseModel):
    batch_id: int


class ConfirmAllRequest(BaseModel):
    batch_ids: list[int]


# ============ Statistics ============
class SummaryOut(BaseModel):
    total_income: float = 0
    total_expense: float = 0
    net: float = 0
    transaction_count: int = 0


class PeriodStat(BaseModel):
    period_label: str
    income: float = 0
    expense: float = 0
    count: int = 0


class CategoryStat(BaseModel):
    category_id: Optional[int] = None
    category_name: Optional[str] = "未分类"
    category_color: Optional[str] = "#8c8c8c"
    category_icon: Optional[str] = ""
    total_amount: float = 0
    percentage: float = 0
    count: int = 0


class TrendPoint(BaseModel):
    period: str
    income: float = 0
    expense: float = 0


class DailyStat(BaseModel):
    date: str
    income: float = 0
    expense: float = 0
    count: int = 0


# ============ Common ============
class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    page_size: int


class ApiResponse(BaseModel):
    success: bool = True
    data: Any = None
    message: str = "ok"


# ============ Auth ============
class UserRegister(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=4, max_length=100)

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    is_admin: bool
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    user: UserOut
