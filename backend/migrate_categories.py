"""Migration script: add new default categories to an existing database.

Run from the backend directory:
    python migrate_categories.py
"""

from app.database import SessionLocal
from app.models import Category

NEW_CATEGORIES = [
    # ---- 收入分类 ----
    {"name": "奖金绩效", "type": "income", "icon": "TrophyOutlined", "color": "#73d13d"},
    {"name": "理财赎回", "type": "income", "icon": "StockOutlined", "color": "#d9f7be"},
    {"name": "利息收益", "type": "income", "icon": "PercentageOutlined", "color": "#f6ffed"},
    {"name": "房租收入", "type": "income", "icon": "HomeOutlined", "color": "#bae637"},
    {"name": "礼金红包", "type": "income", "icon": "GiftOutlined", "color": "#597ef7"},
    {"name": "退款返利", "type": "income", "icon": "ReloadOutlined", "color": "#67e8f9"},
    {"name": "报销款", "type": "income", "icon": "FileTextOutlined", "color": "#c084fc"},
    # ---- 支出分类 ----
    {"name": "通讯网络", "type": "expense", "icon": "WifiOutlined", "color": "#f4d03f"},
    {"name": "服饰美容", "type": "expense", "icon": "SkinOutlined", "color": "#eb2f96"},
    {"name": "日用百货", "type": "expense", "icon": "InboxOutlined", "color": "#f06292"},
    {"name": "数码电器", "type": "expense", "icon": "LaptopOutlined", "color": "#7c3aed"},
    {"name": "汽车养护", "type": "expense", "icon": "ToolOutlined", "color": "#5b8c5a"},
    {"name": "运动健身", "type": "expense", "icon": "ThunderboltOutlined", "color": "#3eaf7c"},
    {"name": "宠物", "type": "expense", "icon": "GithubOutlined", "color": "#f7b731"},
    {"name": "人情往来", "type": "expense", "icon": "TeamOutlined", "color": "#a855f7"},
    {"name": "知识付费", "type": "expense", "icon": "BookOutlined", "color": "#0ea5e9"},
    # ---- 不计收支分类 ----
    {"name": "内部转账", "type": "ignore", "icon": "SwapOutlined", "color": "#9ca3af"},
    {"name": "信用卡还款", "type": "ignore", "icon": "CreditCardOutlined", "color": "#6b7280"},
    {"name": "借贷还款", "type": "ignore", "icon": "TransactionOutlined", "color": "#78716c"},
    {"name": "投资理财", "type": "ignore", "icon": "FundOutlined", "color": "#a8a29e"},
    {"name": "账户存取", "type": "ignore", "icon": "BankOutlined", "color": "#8b8b83"},
    {"name": "退款", "type": "ignore", "icon": "ReloadOutlined", "color": "#a1a1aa"},
    {"name": "其他不计收支", "type": "ignore", "icon": "EllipsisOutlined", "color": "#b0b0b0"},
]


def migrate():
    db = SessionLocal()
    added = 0
    skipped = 0

    try:
        existing_names = {c.name for c in db.query(Category).all()}

        # Find max sort_order for each type to append after existing
        max_order = {}
        for c in db.query(Category).all():
            max_order[c.type] = max(max_order.get(c.type, -1), c.sort_order)

        for cat in NEW_CATEGORIES:
            if cat["name"] in existing_names:
                skipped += 1
                continue

            sort = max_order.get(cat["type"], -1) + 1
            max_order[cat["type"]] = sort

            obj = Category(
                name=cat["name"],
                type=cat["type"],
                icon=cat["icon"],
                color=cat["color"],
                sort_order=sort,
            )
            db.add(obj)
            added += 1

        db.commit()
        print(f"Migration complete: {added} new categories added, {skipped} already existed (skipped).")

        # Show summary by type
        cats = db.query(Category).order_by(Category.type, Category.sort_order).all()
        for t in ("income", "expense", "ignore"):
            type_cats = [c for c in cats if c.type == t]
            type_label = {"income": "收入", "expense": "支出", "ignore": "不计收支"}[t]
            print(f"\n  [{type_label}] ({len(type_cats)} categories):")
            for c in type_cats:
                print(f"    {c.name}")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
