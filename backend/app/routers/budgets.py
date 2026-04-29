"""Budget CRUD + alert endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Budget, User
from ..schemas import BudgetCreate, BudgetUpdate, ApiResponse
from ..services.budget_service import get_budget_alerts
from ..auth import get_current_user

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("")
def list_budgets(
    year: int | None = None,
    month: int | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Budget).filter(Budget.user_id == current_user.id)
    if year is not None:
        q = q.filter(Budget.year == year)
    if month is not None:
        q = q.filter((Budget.period != "monthly") | (Budget.month == month))
    if is_active is not None:
        q = q.filter(Budget.is_active == int(is_active))

    budgets = q.order_by(Budget.created_at.desc()).all()
    now = __import__("datetime").datetime.now()
    yr = year or now.year
    mo = month or now.month

    results = []
    for b in budgets:
        alerts = get_budget_alerts(db, b.year or yr, b.month, current_user.id)
        matching = [a for a in alerts if a["id"] == b.id]
        if matching:
            results.append(matching[0])
        else:
            results.append({
                "id": b.id,
                "category_id": b.category_id,
                "category_name": b.category.name if b.category else "",
                "category_color": b.category.color if b.category else "#1677ff",
                "amount": b.amount,
                "period": b.period,
                "year": b.year,
                "month": b.month,
                "week_start": b.week_start,
                "alert_ratio": b.alert_ratio,
                "is_active": bool(b.is_active),
                "spent": 0,
                "spent_ratio": 0,
                "severity": "ok",
            })

    return ApiResponse(data=results)


@router.post("")
def create_budget(data: BudgetCreate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    budget = Budget(
        category_id=data.category_id,
        amount=data.amount,
        period=data.period,
        year=data.year,
        month=data.month,
        week_start=data.week_start,
        alert_ratio=data.alert_ratio,
        is_active=int(data.is_active),
        user_id=current_user.id,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return ApiResponse(data={"id": budget.id, "message": "预算创建成功"})


@router.patch("/{budget_id}")
def update_budget(budget_id: int, data: BudgetUpdate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    budget = db.query(Budget).filter(
        Budget.id == budget_id, Budget.user_id == current_user.id
    ).first()
    if not budget:
        raise HTTPException(404, "预算不存在")
    if data.amount is not None:
        budget.amount = data.amount
    if data.alert_ratio is not None:
        budget.alert_ratio = data.alert_ratio
    if data.is_active is not None:
        budget.is_active = int(data.is_active)
    db.commit()
    return ApiResponse(message="更新成功")


@router.delete("/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    budget = db.query(Budget).filter(
        Budget.id == budget_id, Budget.user_id == current_user.id
    ).first()
    if not budget:
        raise HTTPException(404, "预算不存在")
    db.delete(budget)
    db.commit()
    return ApiResponse(message="已删除")


@router.get("/alerts")
def alerts(
    year: int | None = None,
    month: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = __import__("datetime").datetime.now()
    yr = year or now.year
    mo = month or now.month
    return ApiResponse(data=get_budget_alerts(db, yr, mo, current_user.id))
