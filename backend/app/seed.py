"""Seed default categories and auto-categorization rules on first run."""
from .database import SessionLocal
from .models import Category, CategoryRule


DEFAULT_CATEGORIES = [
    # ---- 收入分类 ----
    {"name": "工资收入", "type": "income", "icon": "💰", "color": "#52c41a"},
    {"name": "奖金绩效", "type": "income", "icon": "🏆", "color": "#73d13d"},
    {"name": "兼职收入", "type": "income", "icon": "💼", "color": "#95de64"},
    {"name": "投资收益", "type": "income", "icon": "📈", "color": "#b7eb8f"},
    {"name": "理财赎回", "type": "income", "icon": "📊", "color": "#d9f7be"},
    {"name": "利息收益", "type": "income", "icon": "💹", "color": "#f6ffed"},
    {"name": "房租收入", "type": "income", "icon": "🏠", "color": "#bae637"},
    {"name": "礼金红包", "type": "income", "icon": "🧧", "color": "#597ef7"},
    {"name": "退款返利", "type": "income", "icon": "↩️", "color": "#67e8f9"},
    {"name": "报销款", "type": "income", "icon": "📋", "color": "#c084fc"},
    {"name": "转账收入", "type": "income", "icon": "💸", "color": "#faad14"},
    {"name": "其他收入", "type": "income", "icon": "📥", "color": "#8cd3a5"},
    # ---- 支出分类 ----
    {"name": "餐饮美食", "type": "expense", "icon": "🍜", "color": "#ff4d4f"},
    {"name": "交通出行", "type": "expense", "icon": "🚗", "color": "#ff7a45"},
    {"name": "购物消费", "type": "expense", "icon": "🛒", "color": "#ffa940"},
    {"name": "住房物业", "type": "expense", "icon": "🏡", "color": "#ffc53d"},
    {"name": "水电燃气", "type": "expense", "icon": "⚡", "color": "#ffec3d"},
    {"name": "通讯网络", "type": "expense", "icon": "📶", "color": "#f4d03f"},
    {"name": "休闲娱乐", "type": "expense", "icon": "🎉", "color": "#e8961e"},
    {"name": "医疗健康", "type": "expense", "icon": "💊", "color": "#36cfc9"},
    {"name": "教育学习", "type": "expense", "icon": "📚", "color": "#597ef7"},
    {"name": "服饰美容", "type": "expense", "icon": "💄", "color": "#eb2f96"},
    {"name": "日用百货", "type": "expense", "icon": "🏪", "color": "#f06292"},
    {"name": "数码电器", "type": "expense", "icon": "💻", "color": "#7c3aed"},
    {"name": "汽车养护", "type": "expense", "icon": "🔧", "color": "#5b8c5a"},
    {"name": "运动健身", "type": "expense", "icon": "🏃", "color": "#3eaf7c"},
    {"name": "宠物", "type": "expense", "icon": "🐾", "color": "#f7b731"},
    {"name": "人情往来", "type": "expense", "icon": "🎁", "color": "#a855f7"},
    {"name": "知识付费", "type": "expense", "icon": "🎓", "color": "#0ea5e9"},
    {"name": "转账红包", "type": "expense", "icon": "🧧", "color": "#9254de"},
    {"name": "居家生活", "type": "expense", "icon": "🏠", "color": "#ef4444"},
    {"name": "其他支出", "type": "expense", "icon": "📤", "color": "#8c8c8c"},
    # ---- 不计收支分类 ----
    {"name": "内部转账", "type": "ignore", "icon": "🔄", "color": "#9ca3af"},
    {"name": "信用卡还款", "type": "ignore", "icon": "💳", "color": "#6b7280"},
    {"name": "借贷还款", "type": "ignore", "icon": "🏦", "color": "#78716c"},
    {"name": "投资理财", "type": "ignore", "icon": "📊", "color": "#a8a29e"},
    {"name": "账户存取", "type": "ignore", "icon": "🏦", "color": "#8b8b83"},
    {"name": "退款", "type": "ignore", "icon": "↩️", "color": "#a1a1aa"},
    {"name": "其他不计收支", "type": "ignore", "icon": "❓", "color": "#b0b0b0"},
]

DEFAULT_RULES = [
    # 餐饮美食
    {"category": "餐饮美食", "field": "counterparty", "pattern": "美团", "match_mode": "contains", "priority": 5},
    {"category": "餐饮美食", "field": "counterparty", "pattern": "饿了么", "match_mode": "contains", "priority": 5},
    {"category": "餐饮美食", "field": "counterparty", "pattern": "肯德基", "match_mode": "contains", "priority": 5},
    {"category": "餐饮美食", "field": "counterparty", "pattern": "麦当劳", "match_mode": "contains", "priority": 5},
    {"category": "餐饮美食", "field": "counterparty", "pattern": "星巴克", "match_mode": "contains", "priority": 5},
    {"category": "餐饮美食", "field": "counterparty", "pattern": "瑞幸", "match_mode": "contains", "priority": 5},
    {"category": "餐饮美食", "field": "product_desc", "pattern": "外卖", "match_mode": "contains", "priority": 5},
    # 交通出行
    {"category": "交通出行", "field": "counterparty", "pattern": "滴滴", "match_mode": "contains", "priority": 5},
    {"category": "交通出行", "field": "counterparty", "pattern": "铁路", "match_mode": "contains", "priority": 5},
    {"category": "交通出行", "field": "counterparty", "pattern": "中国石化", "match_mode": "contains", "priority": 5},
    {"category": "交通出行", "field": "counterparty", "pattern": "中石油", "match_mode": "contains", "priority": 5},
    {"category": "交通出行", "field": "counterparty", "pattern": "高德", "match_mode": "contains", "priority": 5},
    {"category": "交通出行", "field": "product_desc", "pattern": "ETC", "match_mode": "contains", "priority": 5},
    {"category": "交通出行", "field": "product_desc", "pattern": "停车", "match_mode": "contains", "priority": 5},
    # 购物消费
    {"category": "购物消费", "field": "counterparty", "pattern": "淘宝", "match_mode": "contains", "priority": 5},
    {"category": "购物消费", "field": "counterparty", "pattern": "京东", "match_mode": "contains", "priority": 5},
    {"category": "购物消费", "field": "counterparty", "pattern": "拼多多", "match_mode": "contains", "priority": 5},
    {"category": "购物消费", "field": "counterparty", "pattern": "天猫", "match_mode": "contains", "priority": 5},
    # 住房物业
    {"category": "住房物业", "field": "counterparty", "pattern": "链家", "match_mode": "contains", "priority": 5},
    {"category": "住房物业", "field": "product_desc", "pattern": "房租", "match_mode": "contains", "priority": 5},
    {"category": "住房物业", "field": "product_desc", "pattern": "物业", "match_mode": "contains", "priority": 5},
    # 休闲娱乐
    {"category": "休闲娱乐", "field": "counterparty", "pattern": "猫眼", "match_mode": "contains", "priority": 5},
    {"category": "休闲娱乐", "field": "counterparty", "pattern": "腾讯视频", "match_mode": "contains", "priority": 5},
    {"category": "休闲娱乐", "field": "counterparty", "pattern": "爱奇艺", "match_mode": "contains", "priority": 5},
    {"category": "休闲娱乐", "field": "counterparty", "pattern": "哔哩哔哩", "match_mode": "contains", "priority": 5},
    {"category": "休闲娱乐", "field": "counterparty", "pattern": "网易云", "match_mode": "contains", "priority": 5},
    # 转账红包
    {"category": "转账红包", "field": "transaction_type", "pattern": "转账", "match_mode": "contains", "priority": 5},
    {"category": "转账红包", "field": "transaction_type", "pattern": "红包", "match_mode": "contains", "priority": 5},
    # 投资收益（收入类）
    {"category": "投资收益", "field": "product_desc", "pattern": "收益", "match_mode": "contains", "priority": 5},
    {"category": "投资收益", "field": "product_desc", "pattern": "利息", "match_mode": "contains", "priority": 5},
    {"category": "投资收益", "field": "product_desc", "pattern": "分红", "match_mode": "contains", "priority": 5},
]


def seed_categories():
    db = SessionLocal()
    try:
        from .models import User
        existing = db.query(User).count()
        if existing > 0:
            return

        id_map: dict[str, int] = {}
        sort = 0
        for cat in DEFAULT_CATEGORIES:
            obj = Category(name=cat["name"], type=cat["type"], icon=cat["icon"],
                           color=cat["color"], sort_order=sort)
            db.add(obj)
            db.flush()
            id_map[cat["name"]] = obj.id
            sort += 1

        # Seed default rules
        for rule in DEFAULT_RULES:
            cat_id = id_map.get(rule["category"])
            if cat_id:
                db.add(CategoryRule(
                    category_id=cat_id,
                    field=rule["field"],
                    pattern=rule["pattern"],
                    match_mode=rule["match_mode"],
                ))

        db.commit()
    finally:
        db.close()
