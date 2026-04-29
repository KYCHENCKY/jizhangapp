"""Auto-categorization engine: match transactions to categories based on rules."""
import re

from sqlalchemy.orm import Session

from ..models import CategoryRule, Category

# Map transaction direction to category type
DIRECTION_TO_CATEGORY_TYPE = {
    "income": "income",
    "expense": "expense",
    "neutral": "ignore",
}


def auto_categorize(db: Session, transaction) -> int | None:
    """
    Run rules (ordered by priority DESC) against one transaction.
    Only matches rules whose category type corresponds to the transaction direction.
    Returns category_id on first match, or None.
    """
    allowed_type = DIRECTION_TO_CATEGORY_TYPE.get(transaction.direction)
    if not allowed_type:
        return None

    rules = (
        db.query(CategoryRule)
        .join(Category, CategoryRule.category_id == Category.id)
        .filter(Category.type == allowed_type)
        .order_by(CategoryRule.priority.desc())
        .all()
    )
    for rule in rules:
        field_val = ""
        if rule.field == "counterparty":
            field_val = transaction.counterparty or ""
        elif rule.field == "product_desc":
            field_val = transaction.product_desc or ""
        elif rule.field == "transaction_type":
            field_val = transaction.transaction_type or ""

        if not field_val:
            continue

        if rule.match_mode == "exact":
            if field_val == rule.pattern:
                return rule.category_id
        elif rule.match_mode == "regex":
            try:
                if re.search(rule.pattern, field_val):
                    return rule.category_id
            except re.error:
                continue
        else:  # contains (default)
            if rule.pattern.lower() in field_val.lower():
                return rule.category_id

    return None


def batch_auto_categorize(db: Session, transactions: list) -> int:
    """Auto-categorize a list of transactions. Returns count of categorized."""
    count = 0
    for txn in transactions:
        cat_id = auto_categorize(db, txn)
        if cat_id is not None:
            txn.category_id = cat_id
            count += 1
    db.commit()
    return count
