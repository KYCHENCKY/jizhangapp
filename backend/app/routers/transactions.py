"""Transaction CRUD endpoints with filtering, pagination, and batch operations."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, desc, asc
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Transaction, Category, User
from ..schemas import TransactionUpdate, BatchUpdateRequest, ApiResponse, PaginatedResponse
from ..auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    start_date: str | None = None,
    end_date: str | None = None,
    direction: str | None = None,
    category_id: int | None = None,
    source_platform: str | None = None,
    keyword: str | None = None,
    sort_by: str = "transaction_time",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Transaction).options(joinedload(Transaction.category))
    query = query.filter(Transaction.user_id == current_user.id)

    if start_date:
        query = query.filter(Transaction.transaction_time >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_time <= end_date + " 23:59:59")
    if direction:
        query = query.filter(Transaction.direction == direction)
    if category_id is not None:
        query = query.filter(Transaction.category_id == category_id)
    if source_platform:
        query = query.filter(Transaction.source_platform == source_platform)
    if keyword:
        kw = f"%{keyword}%"
        query = query.filter(
            or_(Transaction.counterparty.like(kw), Transaction.product_desc.like(kw))
        )

    total = query.count()

    sort_col = getattr(Transaction, sort_by, Transaction.transaction_time)
    order_fn = desc if sort_order == "desc" else asc
    query = query.order_by(order_fn(sort_col)).offset((page - 1) * page_size).limit(page_size)

    items = []
    for t in query.all():
        d = {
            "id": t.id,
            "transaction_time": t.transaction_time,
            "source_platform": t.source_platform,
            "transaction_type": t.transaction_type,
            "counterparty": t.counterparty,
            "product_desc": t.product_desc,
            "direction": t.direction,
            "amount": t.amount,
            "payment_method": t.payment_method,
            "status": t.status,
            "source_txn_id": t.source_txn_id,
            "merchant_order": t.merchant_order,
            "notes": t.notes,
            "category_id": t.category_id,
            "category_name": t.category.name if t.category else None,
            "category_color": t.category.color if t.category else None,
            "category_icon": t.category.icon if t.category else None,
        }
        items.append(d)

    return ApiResponse(data={
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    })


@router.get("/{txn_id}")
def get_transaction(txn_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    t = db.query(Transaction).options(joinedload(Transaction.category)).filter(
        Transaction.id == txn_id, Transaction.user_id == current_user.id
    ).first()
    if not t:
        raise HTTPException(404, "交易不存在")
    return ApiResponse(data={
        "id": t.id,
        "transaction_time": t.transaction_time,
        "source_platform": t.source_platform,
        "transaction_type": t.transaction_type,
        "counterparty": t.counterparty,
        "product_desc": t.product_desc,
        "direction": t.direction,
        "amount": t.amount,
        "payment_method": t.payment_method,
        "status": t.status,
        "source_txn_id": t.source_txn_id,
        "merchant_order": t.merchant_order,
        "notes": t.notes,
        "category_id": t.category_id,
        "category_name": t.category.name if t.category else None,
        "category_color": t.category.color if t.category else None,
    })


@router.patch("/{txn_id}")
def update_transaction(txn_id: int, data: TransactionUpdate, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    t = db.query(Transaction).filter(
        Transaction.id == txn_id, Transaction.user_id == current_user.id
    ).first()
    if not t:
        raise HTTPException(404, "交易不存在")
    if data.category_id is not None:
        t.category_id = data.category_id
    if data.notes is not None:
        t.notes = data.notes
    db.commit()
    return ApiResponse(message="更新成功")


@router.patch("/batch")
def batch_update(data: BatchUpdateRequest, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    db.query(Transaction).filter(
        Transaction.id.in_(data.ids), Transaction.user_id == current_user.id
    ).update(
        {Transaction.category_id: data.category_id}, synchronize_session=False
    )
    db.commit()
    return ApiResponse(message=f"已更新 {len(data.ids)} 条交易")


@router.delete("/{txn_id}")
def delete_transaction(txn_id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    t = db.query(Transaction).filter(
        Transaction.id == txn_id, Transaction.user_id == current_user.id
    ).first()
    if not t:
        raise HTTPException(404, "交易不存在")
    db.delete(t)
    db.commit()
    return ApiResponse(message="已删除")
