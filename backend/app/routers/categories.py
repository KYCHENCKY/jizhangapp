"""Category CRUD + auto-categorization rule management."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Category, CategoryRule, Transaction, User
from ..schemas import (
    CategoryCreate, CategoryUpdate, CategoryOut,
    CategoryRuleCreate, CategoryRuleOut, ApiResponse,
)
from ..auth import get_current_user

router = APIRouter(prefix="/categories", tags=["categories"])


def _build_category_tree(db: Session, user_id: int) -> list[dict]:
    """Build nested category tree with transaction counts."""
    cats = db.query(Category).filter(Category.user_id == user_id).order_by(Category.sort_order).all()

    # Count transactions per category (scoped to user)
    counts = dict(
        db.query(Transaction.category_id, func.count(Transaction.id))
        .filter(Transaction.category_id.isnot(None), Transaction.user_id == user_id)
        .group_by(Transaction.category_id)
        .all()
    )

    cat_dicts = {}
    for c in cats:
        cat_dicts[c.id] = {
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "parent_id": c.parent_id,
            "icon": c.icon,
            "color": c.color,
            "sort_order": c.sort_order,
            "children": [],
            "transaction_count": counts.get(c.id, 0),
        }

    roots = []
    for c in cats:
        d = cat_dicts[c.id]
        if c.parent_id and c.parent_id in cat_dicts:
            cat_dicts[c.parent_id]["children"].append(d)
        else:
            roots.append(d)

    return roots


@router.get("")
def list_categories(type: str | None = None, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    tree = _build_category_tree(db, current_user.id)
    if type:
        tree = [c for c in tree if c["type"] == type]
    return ApiResponse(data=tree)


# ---- Import / Export ----
class ExportData(BaseModel):
    version: int = 1
    exported_at: str
    categories: list[dict]


@router.get("/export")
def export_rules(db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    """Export all categories and rules as JSON."""
    cats = db.query(Category).filter(Category.user_id == current_user.id).all()
    export_cats = []
    for cat in cats:
        rules = db.query(CategoryRule).filter(
            CategoryRule.category_id == cat.id,
            CategoryRule.user_id == current_user.id,
        ).all()
        export_cats.append({
            "name": cat.name,
            "type": cat.type,
            "icon": cat.icon,
            "color": cat.color,
            "rules": [
                {
                    "field": r.field,
                    "pattern": r.pattern,
                    "match_mode": r.match_mode,
                    "priority": r.priority,
                }
                for r in rules
            ],
        })
    return ApiResponse(data={
        "version": 1,
        "exported_at": datetime.now().isoformat(),
        "categories": export_cats,
    })


class ImportRequest(BaseModel):
    categories: list[dict]


@router.post("/import")
def import_rules(data: ImportRequest, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    """Import categories and rules from JSON. Existing rules are kept, new ones added."""
    created_cats = 0
    created_rules = 0
    skipped_cats = 0

    for cat_data in data.categories:
        name = cat_data.get("name", "").strip()
        cat_type = cat_data.get("type", "expense")
        if not name:
            continue

        cat = db.query(Category).filter(
            Category.name == name,
            Category.type == cat_type,
            Category.user_id == current_user.id,
        ).first()
        if not cat:
            cat = Category(
                name=name,
                type=cat_type,
                icon=cat_data.get("icon", "❓"),
                color=cat_data.get("color", "#1677ff"),
                user_id=current_user.id,
            )
            db.add(cat)
            db.flush()
            created_cats += 1
        else:
            skipped_cats += 1

        for rule_data in cat_data.get("rules", []):
            pattern = rule_data.get("pattern", "").strip()
            if not pattern:
                continue
            field = rule_data.get("field", "counterparty")
            match_mode = rule_data.get("match_mode", "contains")

            existing = db.query(CategoryRule).filter(
                CategoryRule.category_id == cat.id,
                CategoryRule.field == field,
                CategoryRule.pattern == pattern,
                CategoryRule.user_id == current_user.id,
            ).first()
            if existing:
                continue

            db.add(CategoryRule(
                category_id=cat.id,
                field=field,
                pattern=pattern,
                match_mode=match_mode,
                priority=rule_data.get("priority", 5),
                user_id=current_user.id,
            ))
            created_rules += 1

    db.commit()

    from ..services.category_service import batch_auto_categorize
    uncat = db.query(Transaction).filter(
        Transaction.category_id.is_(None),
        Transaction.user_id == current_user.id,
    ).all()
    applied = batch_auto_categorize(db, uncat, current_user.id)

    return ApiResponse(
        data={
            "created_categories": created_cats,
            "skipped_categories": skipped_cats,
            "created_rules": created_rules,
            "applied_to_transactions": applied,
        },
        message=f"导入完成！新增 {created_cats} 个分类、{created_rules} 条规则，已为 {applied} 笔交易自动分类",
    )


@router.post("")
def create_category(data: CategoryCreate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    existing = db.query(Category).filter(
        Category.name == data.name,
        Category.type == data.type,
        Category.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(400, f"分类「{data.name}」已存在")

    cat = Category(
        name=data.name,
        type=data.type,
        parent_id=data.parent_id,
        icon=data.icon,
        color=data.color,
        sort_order=data.sort_order,
        user_id=current_user.id,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return ApiResponse(data={"id": cat.id, "name": cat.name})


@router.patch("/{cat_id}")
def update_category(cat_id: int, data: CategoryUpdate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    cat = db.query(Category).filter(
        Category.id == cat_id, Category.user_id == current_user.id
    ).first()
    if not cat:
        raise HTTPException(404, "分类不存在")
    if data.name is not None:
        cat.name = data.name
    if data.parent_id is not None:
        cat.parent_id = data.parent_id
    if data.icon is not None:
        cat.icon = data.icon
    if data.color is not None:
        cat.color = data.color
    if data.sort_order is not None:
        cat.sort_order = data.sort_order
    db.commit()
    return ApiResponse(message="更新成功")


@router.delete("/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    cat = db.query(Category).filter(
        Category.id == cat_id, Category.user_id == current_user.id
    ).first()
    if not cat:
        raise HTTPException(404, "分类不存在")
    db.delete(cat)
    db.commit()
    return ApiResponse(message="已删除")


# ---- Category Rules ----
@router.post("/apply-all-rules")
def apply_all_rules(db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    """Re-apply all categorization rules to uncategorized transactions."""
    from ..services.category_service import batch_auto_categorize
    uncat = db.query(Transaction).filter(
        Transaction.category_id.is_(None),
        Transaction.user_id == current_user.id,
    ).all()
    total = len(uncat)
    applied = batch_auto_categorize(db, uncat, current_user.id)
    return ApiResponse(data={"total_uncategorized": total, "categorized": applied},
                       message=f"已为 {applied} 笔交易匹配分类（共 {total} 笔未分类）")


@router.get("/{cat_id}/rules")
def list_rules(cat_id: int, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    rules = db.query(CategoryRule).filter(
        CategoryRule.category_id == cat_id,
        CategoryRule.user_id == current_user.id,
    ).order_by(CategoryRule.priority.desc()).all()
    return ApiResponse(data=[CategoryRuleOut.model_validate(r).model_dump() for r in rules])


@router.post("/{cat_id}/rules")
def add_rule(cat_id: int, data: CategoryRuleCreate, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    cat = db.query(Category).filter(
        Category.id == cat_id, Category.user_id == current_user.id
    ).first()
    if not cat:
        raise HTTPException(404, "分类不存在")
    rule = CategoryRule(
        category_id=cat_id,
        field=data.field,
        pattern=data.pattern,
        match_mode=data.match_mode,
        priority=data.priority,
        user_id=current_user.id,
    )
    db.add(rule)
    db.commit()

    # Re-apply rules to all uncategorized transactions
    from ..services.category_service import batch_auto_categorize
    uncat = db.query(Transaction).filter(
        Transaction.category_id.is_(None),
        Transaction.user_id == current_user.id,
    ).all()
    applied = batch_auto_categorize(db, uncat, current_user.id)

    return ApiResponse(data={
        "rule": CategoryRuleOut.model_validate(rule).model_dump(),
        "applied_count": applied,
    })


@router.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    rule = db.query(CategoryRule).filter(
        CategoryRule.id == rule_id, CategoryRule.user_id == current_user.id
    ).first()
    if not rule:
        raise HTTPException(404, "规则不存在")
    db.delete(rule)
    db.commit()
    return ApiResponse(message="已删除")
