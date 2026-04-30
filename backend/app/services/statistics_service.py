"""Aggregation queries for statistics API."""
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from ..models import Transaction, Category


def _apply_filters(query, start_date=None, end_date=None, source_platform=None, exclude_neutral=True, user_id=None):
    if user_id is not None:
        query = query.filter(Transaction.user_id == user_id)
    if start_date:
        query = query.filter(Transaction.transaction_time >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_time <= end_date + " 23:59:59")
    if source_platform:
        query = query.filter(Transaction.source_platform == source_platform)
    # Exclude "不计收支" neutral transactions from all statistics
    if exclude_neutral:
        query = query.filter(Transaction.direction != "neutral")
    return query


def get_summary(
    db: Session,
    start_date: str | None = None,
    end_date: str | None = None,
    source_platform: str | None = None,
    user_id: int | None = None,
) -> dict:
    q = db.query(
        func.coalesce(func.sum(
            case((Transaction.direction == "income", Transaction.amount), else_=0)
        ), 0).label("total_income"),
        func.coalesce(func.sum(
            case((Transaction.direction == "expense", Transaction.amount), else_=0)
        ), 0).label("total_expense"),
        func.count(Transaction.id).label("count"),
    )
    q = _apply_filters(q, start_date, end_date, source_platform, user_id=user_id)
    row = q.first()
    return {
        "total_income": round(float(row.total_income), 2),
        "total_expense": round(float(row.total_expense), 2),
        "net": round(float(row.total_income - row.total_expense), 2),
        "transaction_count": row.count,
    }


def get_by_period(
    db: Session,
    granularity: str,
    start_date: str | None = None,
    end_date: str | None = None,
    direction: str | None = None,
    source_platform: str | None = None,
    user_id: int | None = None,
) -> list[dict]:
    if granularity == "yearly":
        fmt = "%Y"
    elif granularity == "monthly":
        fmt = "%Y-%m"
    else:
        fmt = "%Y-%W"

    label_col = func.strftime(fmt, Transaction.transaction_time)

    q = db.query(
        label_col.label("period_label"),
        func.coalesce(func.sum(
            case((Transaction.direction == "income", Transaction.amount), else_=0)
        ), 0).label("income"),
        func.coalesce(func.sum(
            case((Transaction.direction == "expense", Transaction.amount), else_=0)
        ), 0).label("expense"),
        func.count(Transaction.id).label("count"),
    )

    q = _apply_filters(q, start_date, end_date, source_platform, user_id=user_id)
    if direction:
        q = q.filter(Transaction.direction == direction)

    q = q.group_by(label_col).order_by(label_col)

    return [
        {
            "period_label": row.period_label,
            "income": round(float(row.income), 2),
            "expense": round(float(row.expense), 2),
            "count": row.count,
        }
        for row in q.all()
    ]


def get_by_category(
    db: Session,
    start_date: str | None = None,
    end_date: str | None = None,
    direction: str = "expense",
    source_platform: str | None = None,
    user_id: int | None = None,
) -> list[dict]:
    q = db.query(
        Transaction.category_id,
        Category.name.label("category_name"),
        Category.color.label("category_color"),
        Category.icon.label("category_icon"),
        func.sum(Transaction.amount).label("total_amount"),
        func.count(Transaction.id).label("cnt"),
    ).outerjoin(Category, Transaction.category_id == Category.id)

    q = q.filter(Transaction.direction == direction)
    q = _apply_filters(q, start_date, end_date, source_platform, user_id=user_id)

    q = q.group_by(Transaction.category_id).order_by(func.sum(Transaction.amount).desc())
    rows = q.all()

    grand_total = sum(float(r.total_amount) for r in rows)
    results = []
    for r in rows:
        amt = round(float(r.total_amount), 2)
        results.append({
            "category_id": r.category_id,
            "category_name": r.category_name or "未分类",
            "category_color": r.category_color or "#8c8c8c",
            "category_icon": r.category_icon or "",
            "total_amount": amt,
            "percentage": round(amt / grand_total * 100, 1) if grand_total > 0 else 0,
            "count": r.cnt,
        })
    return results


def get_daily(
    db: Session,
    year: int,
    month: int,
    direction: str | None = None,
    source_platform: str | None = None,
    user_id: int | None = None,
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

    q = _apply_filters(q, source_platform=source_platform, user_id=user_id)
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


def get_trend(
    db: Session,
    granularity: str = "monthly",
    months: int = 12,
    category_id: int | None = None,
    source_platform: str | None = None,
    user_id: int | None = None,
) -> list[dict]:
    if granularity == "monthly":
        fmt = "%Y-%m"
    else:
        fmt = "%Y-%W"

    label_col = func.strftime(fmt, Transaction.transaction_time)

    q = db.query(
        label_col.label("period"),
        func.coalesce(func.sum(
            case((Transaction.direction == "income", Transaction.amount), else_=0)
        ), 0).label("income"),
        func.coalesce(func.sum(
            case((Transaction.direction == "expense", Transaction.amount), else_=0)
        ), 0).label("expense"),
    )

    q = _apply_filters(q, source_platform=source_platform, user_id=user_id)
    if category_id is not None:
        q = q.filter(Transaction.category_id == category_id)

    q = q.group_by(label_col).order_by(label_col.desc()).limit(months)
    rows = list(q.all())
    rows.reverse()

    return [
        {"period": r.period, "income": round(float(r.income), 2), "expense": round(float(r.expense), 2)}
        for r in rows
    ]
