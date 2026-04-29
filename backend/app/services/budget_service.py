"""Budget alert calculation."""
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Budget, Transaction


def get_budget_alerts(db: Session, year: int, month: int | None = None) -> list[dict]:
    """Return all active budgets with current spending and severity."""
    budgets = db.query(Budget).filter(Budget.is_active == 1).all()
    alerts = []

    for b in budgets:
        spent = _calculate_spent(db, b, year, month)
        ratio = spent / b.amount if b.amount > 0 else 0
        if spent >= b.amount:
            severity = "exceeded"
        elif ratio >= b.alert_ratio:
            severity = "warning"
        else:
            severity = "ok"

        alerts.append({
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
            "spent": round(spent, 2),
            "spent_ratio": round(ratio, 2),
            "severity": severity,
        })

    # Sort: exceeded first, then warning, then ok
    severity_order = {"exceeded": 0, "warning": 1, "ok": 2}
    alerts.sort(key=lambda x: severity_order.get(x["severity"], 3))
    return alerts


def _calculate_spent(db: Session, budget: Budget, year: int, month: int | None) -> float:
    """Calculate actual spending for a budget in the given period."""
    q = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.direction == "expense",
        Transaction.category_id == budget.category_id,
    )

    if budget.period == "yearly":
        q = q.filter(func.strftime("%Y", Transaction.transaction_time) == str(year))
    elif budget.period == "monthly":
        if month is not None:
            q = q.filter(
                func.strftime("%Y-%m", Transaction.transaction_time) == f"{year}-{month:02d}"
            )
        else:
            q = q.filter(func.strftime("%Y", Transaction.transaction_time) == str(year))
    elif budget.period == "weekly" and budget.week_start:
        wk_start = datetime.strptime(budget.week_start, "%Y-%m-%d")
        wk_end = wk_start + timedelta(days=6)
        q = q.filter(
            Transaction.transaction_time >= wk_start.strftime("%Y-%m-%d"),
            Transaction.transaction_time <= wk_end.strftime("%Y-%m-%d") + " 23:59:59",
        )

    return float(q.scalar())
