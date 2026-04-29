"""AI-driven bulk categorization of uncategorized transactions.

Analyzes counterparty, product_desc, transaction_type, direction, and amount
to assign the best-matching category via keyword + semantic rules.
"""

from app.database import SessionLocal
from app.models import Transaction, Category

# ---------------------------------------------------------------------------
# Categorization rules — each is (field, keyword_list, category_name)
# field: "counterparty" | "product_desc" | "transaction_type"
# Evaluated in order; first match wins.
# ---------------------------------------------------------------------------
RULES = [
    # === IGNORE: 不计收支 ===
    ("counterparty", ["支付宝", "余额宝"], "内部转账"),
    ("product_desc", ["自动转", "余额转", "转账收款", "转账到", "转出到", "充值到"], "内部转账"),
    ("transaction_type", ["转账", "红包"], "内部转账"),
    ("counterparty", ["信用卡", "银行"], "信用卡还款"),
    ("product_desc", ["信用卡还款", "信用卡还款", "还款"], "信用卡还款"),
    ("product_desc", ["花呗", "借呗", "贷款", "还贷"], "借贷还款"),
    ("counterparty", ["基金", "财富", "蚂蚁"], "投资理财"),
    ("product_desc", ["基金", "ETF", "指数", "股票", "债券", "赎回", "申购", "买入", "卖出", "QDII", "A股"], "投资理财"),
    ("product_desc", ["账户存取", "提现", "充值", "存入"], "账户存取"),
    ("product_desc", ["退款", "退费", "赔付", "退还"], "退款"),

    # === EXPENSE: 支出 ===
    # 餐饮美食
    ("counterparty", ["美团", "饿了么", "肯德基", "麦当劳", "星巴克", "瑞幸", "喜茶",
        "奈雪", "海底捞", "必胜客", "华莱士", "汉堡王", "萨莉亚",
        "一点点", "coco", "茶百道", "霸王茶姬", "蜜雪冰城", "古茗"], "餐饮美食"),
    ("product_desc", ["外卖", "餐饮", "餐", "饭", "奶茶", "咖啡", "火锅", "烧烤", "小吃"], "餐饮美食"),

    # 交通出行
    ("counterparty", ["滴滴", "曹操", "T3", "首汽", "神州", "高德", "百度",
        "铁路", "中铁", "12306", "航空", "东方航空", "南方航空", "中国国航",
        "中国石化", "中石油", "加油站", "壳牌",
        "公交", "地铁", "轻轨", "轨道交通", "一卡通"], "交通出行"),
    ("product_desc", ["打车", "快车", "专车", "顺风车", "出租车", "停车", "ETC",
        "火车票", "机票", "动车", "高铁", "加油", "充电", "公交", "地铁",
        "哈啰", "青桔", "美团单车", "共享单车"], "交通出行"),

    # 购物消费
    ("counterparty", ["淘宝", "天猫", "京东", "拼多多", "唯品会", "苏宁", "当当",
        "得物", "闲鱼", "1688", "网易严选", "小米", "华为",
        "山姆", "盒马", "永辉", "大润发", "沃尔玛", "家乐福",
        "名创优品", "屈臣氏", "无印良品", "ZARA", "H&M", "优衣库"], "购物消费"),
    ("product_desc", ["购物", "订单", "商品", "快递", "包裹", "超市"], "购物消费"),

    # 住房物业
    ("product_desc", ["房租", "租金", "物业", "房产", "中介", "自如", "链家",
        "贝壳", "维修", "装修", "搬家"], "住房物业"),
    ("counterparty", ["链家", "自如", "贝壳", "物业", "万科", "碧桂园", "恒大"], "住房物业"),

    # 水电燃气
    ("product_desc", ["电费", "水费", "燃气", "煤气", "暖气", "有线电视"], "水电燃气"),
    ("counterparty", ["国家电网", "南方电网", "燃气", "水务", "中国电信", "中国移动", "中国联通",
        "华数", "歌华"], "水电燃气"),

    # 通讯网络
    ("product_desc", ["话费", "流量", "宽带", "固话", "手机费", "通信"], "通讯网络"),
    ("counterparty", ["中国移动", "中国联通", "中国电信"], "通讯网络"),

    # 休闲娱乐
    ("counterparty", ["猫眼", "淘票票", "腾讯视频", "爱奇艺", "优酷", "哔哩哔哩", "B站",
        "网易云", "QQ音乐", "酷狗", "抖音", "快手", "Steam", "任天堂",
        "KTV", "剧本杀", "密室", "游乐园", "迪士尼", "欢乐谷",
        "携程", "去哪儿", "飞猪", "同程", "艺龙"], "休闲娱乐"),
    ("product_desc", ["电影", "演出", "演唱会", "音乐", "游戏", "会员", "景区",
        "酒店", "民宿", "旅游", "机票", "火车票"], "休闲娱乐"),

    # 医疗健康
    ("counterparty", ["医院", "诊所", "药房", "药", "医", "健康", "丁香",
        "平安好医生", "微医", "阿里健康"], "医疗健康"),
    ("product_desc", ["挂号", "医药", "药", "病历", "体检", "门诊", "住院", "手术",
        "中药", "西药", "口罩", "消毒"], "医疗健康"),

    # 教育学习
    ("counterparty", ["学校", "大学", "学院", "培训", "新东方", "学而思", "知乎",
        "得到", "极客时间", "慕课", "Coursera", "udemy", "学堂在线"], "教育学习"),
    ("product_desc", ["学费", "培训", "课程", "书本", "教材", "考试", "报名"], "教育学习"),

    # 服饰美容
    ("counterparty", ["屈臣氏", "丝芙兰", "完美日记", "花西子", "兰蔻", "雅诗兰黛",
        "SK-II", "资生堂", "innisfree", "悦诗风吟", "MAC", "YSL",
        "Nike", "Adidas", "安踏", "李宁", "迪卡侬"], "服饰美容"),
    ("product_desc", ["衣服", "鞋", "包", "化妆品", "护肤品", "口红", "香水",
        "面膜", "美容", "美发", "美甲", "理发"], "服饰美容"),

    # 日用百货
    ("counterparty", ["宜家", "IKEA", "名创优品", "无印良品", "MUJI", "MINISO"], "日用百货"),
    ("product_desc", ["日用品", "纸巾", "洗发", "沐浴", "洗衣", "清洁", "垃圾袋",
        "厨房", "餐具", "收纳", "水杯", "保温杯", "毛巾", "牙刷"], "日用百货"),

    # 数码电器
    ("counterparty", ["苹果", "Apple", "华为商", "小米商", "OPPO", "vivo", "三星",
        "大疆", "联想", "华硕", "戴尔", "惠普", "佳能", "索尼",
        "罗技", "雷蛇"], "数码电器"),
    ("product_desc", ["手机", "电脑", "平板", "电视", "耳机", "充电器", "数据线",
        "硬盘", "U盘", "显示器", "键盘", "鼠标", "相机", "音箱"], "数码电器"),

    # 汽车养护
    ("product_desc", ["洗车", "保养", "维修", "4S", "保险", "年检", "轮胎", "机油",
        "车险", "交强险", "商业险"], "汽车养护"),

    # 运动健身
    ("counterparty", ["keep", "超级猩猩", "乐刻", "威尔仕", "一兆韦德",
        "迪卡侬", "Lululemon", "健身"], "运动健身"),
    ("product_desc", ["健身", "运动", "瑜伽", "游泳", "跑步", "骑行", "攀岩",
        "滑雪", "运动鞋", "器材", "哑铃", "跳绳"], "运动健身"),

    # 宠物
    ("product_desc", ["猫", "狗", "宠物", "猫粮", "狗粮", "猫砂", "宠物医院",
        "驱虫", "疫苗", "绝育", "洗澡", "美容", "寄养"], "宠物"),

    # 人情往来
    ("product_desc", ["红包", "转账", "份子", "礼金", "压岁", "份子钱"], "人情往来"),

    # 知识付费
    ("counterparty", ["樊登", "喜马拉雅", "知识星球", "小鹅通", "千聊"],
        "知识付费"),
    ("product_desc", ["知识付费", "课程", "专栏", "付费"], "知识付费"),

    # 居家生活 (general home)
    ("counterparty", ["宜家", "居然之家", "红星美凯龙", "全友", "林氏"], "居家生活"),
    ("product_desc", ["家具", "沙发", "床垫", "窗帘", "灯具", "桌", "椅",
        "空调", "冰箱", "洗衣机", "吸尘器", "扫地机", "拖地机"], "居家生活"),

    # 快递物流
    ("counterparty", ["顺丰", "圆通", "申通", "中通", "韵达", "极兔", "菜鸟"], "购物消费"),

    # === INCOME: 收入 ===
    ("counterparty", ["北京字跳", "字节跳动", "腾讯", "阿里", "百度", "美团",
        "华为", "小米", "网易", "京东", "拼多多", "蚂蚁"], "工资收入"),
    ("product_desc", ["工资", "薪资", "薪酬", "津贴", "补贴", "差旅报销"], "工资收入"),
    ("product_desc", ["奖金", "绩效", "年终", "激励", "股份"], "奖金绩效"),
    ("product_desc", ["报销", "差旅", "垫付"], "报销款"),
    ("product_desc", ["利息", "收益", "分红", "理财", "赎回"], "利息收益"),
    ("product_desc", ["兼职", "副业", "咨询", "稿费", "翻译"], "兼职收入"),
    ("product_desc", ["房租", "租金"], "房租收入"),
    ("product_desc", ["红包", "转账", "礼金"], "礼金红包"),
    ("counterparty", ["闲鱼", "转转"], "退款返利"),
    ("product_desc", ["退款", "返利", "返现", "赔付", "退费", "理赔"], "退款返利"),

    # === Additional patterns from data analysis ===
    # 支付宝 internal transfers (catch-all for various Chinese renderings)
    ("product_desc", ["自动转", "余额转", "转账到", "转出到", "余额宝", "转入"], "内部转账"),
    ("product_desc", ["信用卡还款", "信用卡还款", "还信用卡", "还款"], "信用卡还款"),
    ("counterparty", ["信用卡", "银行", "银联"], "信用卡还款"),

    # 微信 related
    ("counterparty", ["微信红包", "微信转账", "微信付款"], "礼金红包"),
    ("product_desc", ["微信红包", "拼手气红包", "普通红包", "转账"], "礼金红包"),
    ("product_desc", ["微信转账", "微信付款"], "转账收入"),

    # Personal names (common patterns in Chinese payment data)
    ("counterparty", ["Zhao", "Wang", "Li", "Zhang", "Liu", "Chen", "Yang",
        "Huang", "Wu", "Zhou", "Xu", "Sun", "Ma", "Zhu", "Hu", "Lin", "Guo",
        "He", "Gao", "Luo"], "人情往来"),

    # Car/vehicle
    ("product_desc", ["汽车", "客车", "轿车", "越野", "SUV", "新能源", "机动车", "车牌",
        "车管", "交管", "违章", "年检"], "汽车养护"),
    ("counterparty", ["汽车", "车管", "交管", "4S", "大众", "丰田", "本田", "日产",
        "宝马", "奔驰", "奥迪", "比亚迪", "特斯拉", "蔚来", "理想", "小鹏"], "汽车养护"),

    # Digital services / NAS / media sharing income
    ("product_desc", ["阿里云盘", "影音", "影视", "影城", "nas", "synology", "群晖",
        "alist", "emby", "infuse", "vlc", "jellyfin", "plex",
        "账号", "共享", "网盘", "云盘", "字幕", "pt站"], "兼职收入"),

    # Professional services / consulting
    ("product_desc", ["服务费", "咨询", "顾问", "软件", "开发", "设计",
        "NCode", "结构", "疲劳", "分析"], "兼职收入"),

    # Oil/gas stations (additional)
    ("counterparty", ["石油", "石化", "中海油", "壳牌", "BP", "道达爾"], "交通出行"),

    # Shanghai specific
    ("counterparty", ["研究院", "研究所", "设计院"], "教育学习"),
    ("counterparty", ["浦东", "浦西", "徐汇", "静安", "黄浦", "长宁", "杨浦", "虹口",
        "闵行", "宝山", "嘉定", "松江", "青浦", "奉贤", "崇明"], "交通出行"),

    # Wechat work / enterprise
    ("counterparty", ["企业微信", "企业付款"], "转账收入"),
    ("product_desc", ["企业付款", "企业微信"], "转账收入"),

    # Person-to-person transfer
    ("product_desc", ["零钱", "收款", "转账收款"], "转账收入"),
    ("product_desc", ["扫二维码", "收款码", "赞赏码"], "转账收入"),

    # Various Alipay neutral transactions
    ("counterparty", ["余额宝", "余利宝", "网商银行"], "内部转账"),
    ("product_desc", ["余额宝", "余利宝", "转入", "转出", "收益发放", "基金"], "内部转账"),

    # Traffic/Transport additional
    ("counterparty", ["公交", "地铁", "轨交", "轻轨", "通卡", "市民卡", "城通卡"], "交通出行"),
    ("product_desc", ["乘车", "扫码", "刷卡", "通行费", "过路费", "高速"], "交通出行"),

    # Food delivery
    ("counterparty", ["外卖", "饭"], "餐饮美食"),

    # Medical additional
    ("counterparty", ["药", "医", "院", "诊所", "卫生", "健"], "医疗健康"),

    # Shopping additional
    ("counterparty", ["淘宝", "京东", "拼多多", "天猫", "苏宁", "唯品会", "得物", "当当"], "购物消费"),
    ("product_desc", ["订单", "商品", "购物", "快递", "包裹", "运费"], "购物消费"),

    # Misc income patterns
    ("product_desc", ["赞赏", "打赏", "赞助", "捐赠"], "其他收入"),

    # Neutral transaction types
    ("counterparty", ["基金", "财富", "理财", "证券", "券商", "雪球", "东方财富"], "投资理财"),

    # Refund patterns
    ("counterparty", ["退款", "退费"], "退款"),
    ("product_desc", ["退费", "退回", "赔付", "理赔", "补偿"], "退款返利"),

    # === Catch-all rules for remaining uncategorized ===
    # Small car / vehicle expenses
    ("product_desc", ["汽车", "客车", "轿车", "行车", "停车", "加油", "充电桩",
        "充电", "车位", "车库", "交警", "罚单", "车票", "通行",
        "租车", "神州", "一嗨", "携程租车", "凹凸"], "交通出行"),

    # Ansys/CAE/FEA consulting
    ("product_desc", ["ansys", "abaqus", "fluent", "adams", "ncode", "lsdyna",
        "cae", "fea", "模拟", "仿真", "有限元", "Python"], "兼职收入"),

    # Hardware purchases (hard drives, etc)
    ("product_desc", ["硬盘", "移动硬盘", "希捷", "西数", "酷狼",
        "ssd", "固态", "内存", "显卡", "cpu", "主板"], "数码电器"),

    # Person-to-person transfers (common Chinese names)
    ("counterparty", ["娟", "伟", "刚", "强", "敏", "静", "芳", "丽", "磊",
        "涛", "勇", "军", "杰", "波", "华", "英", "明", "玲", "秀英",
        "华荣", "毅", "志强", "海燕", "燕华"], "人情往来"),

    # Travel
    ("counterparty", ["航空", "机场", "火车站", "高铁", "航旅"], "交通出行"),

    # Video/movie related services
    ("product_desc", ["影城", "影院", "电影票", "VIP", "会员卡", "万达影城",
        "CGV", "百丽宫", "百老汇", "UA", "金逸", "大地"], "休闲娱乐"),
    ("counterparty", ["影城", "影院", "电影票", "万达影城",
        "CGV", "百丽宫", "金逸", "大地"], "休闲娱乐"),

    # Rent car
    ("counterparty", ["租车", "一嗨", "神州", "携程"], "交通出行"),

    # Misc business expenses
    ("counterparty", ["科技", "信息", "网络", "软件", "数据", "智能"], "其他支出"),
    ("counterparty", ["餐饮", "饭店", "餐厅", "酒家", "小吃", "烧烤", "火锅"], "餐饮美食"),

    # Specific remaining items
    ("counterparty", ["Xuelian"], "人情往来"),
    ("counterparty", ["一嗨", "神州租车", "携程租车", "租车"], "交通出行"),
    ("counterparty", ["地铁", "轨交", "轨道交通", "公共交通", "巴士"], "交通出行"),
    ("counterparty", ["肯德基", "麦当劳", "必胜客", "汉堡王", "德克士", "华莱士"], "餐饮美食"),
    ("counterparty", ["益丰", "老百姓", "同仁堂", "大药房", "药房", "药店"], "医疗健康"),
    ("counterparty", ["水", "电", "燃", "热力", "水务", "电力"], "水电燃气"),
    ("product_desc", ["水费", "电费", "燃气", "水费单", "水费账单", "水", "电"], "水电燃气"),
    ("counterparty", ["沃尔玛", "永辉", "大润发", "华润万家", "联华", "物美", "超市发",
        "全家", "罗森", "711", "便利蜂"], "购物消费"),

    # Catch remaining digital content / CAE services
    ("product_desc", ["Abaqus", "Hypermesh", "Ansys", "Adams", "nCode",
        "lsdyna", "fea", "cae", "有限元", "仿真", "模拟",
        "Python", "matlab", "solidworks", "catia", "UG",
        "star", "hypermesh", "patran", "nastran"], "兼职收入"),

    # Individual transfers with masked names
    ("counterparty", ["娟", "伟", "勇", "强", "芳", "磊", "涛", "敏", "静", "丽",
        "杰", "军", "波", "文", "斌", "鑫", "辉", "峰", "娜", "霞"], "人情往来"),

    # Any product_desc containing "零钱" or "转账" is a transfer
    ("product_desc", ["零钱收款", "零钱通", "转账汇款", "转账到银行卡"], "转账收入"),
    ("product_desc", ["零钱付款", "零钱支付"], "转账红包"),

    # Last-resort: catch remaining by single keyword analysis
    ("product_desc", ["影", "剧", "影视", "视频", "网盘", "盘"], "兼职收入"),
    ("counterparty", ["影", "剧"], "休闲娱乐"),

    # Petrol station catch-all
    ("counterparty", ["油", "石化", "石油"], "交通出行"),

    # Food-related businesses
    ("counterparty", ["食品", "餐饮", "美食", "小吃", "烧烤", "火锅", "米线",
        "面馆", "料理", "寿司", "披萨", "烘焙", "蛋糕", "面包",
        "零食", "坚果", "糖", "巧克力"], "餐饮美食"),
    ("product_desc", ["食品", "餐饮", "美食", "外卖", "快餐", "食堂"], "餐饮美食"),

    # Retail / shopping catch
    ("counterparty", ["超市", "便利店", "商场", "百货", "商行", "贸易",
        "母婴", "玩具", "文具", "书店", "花店", "水果"], "购物消费"),

    # Water / beverage purchases → 日用百货
    ("product_desc", ["农夫山泉", "矿泉水", "饮料", "纯净水", "水"], "日用百货"),

    # Highway / toll
    ("counterparty", ["高速", "公路", "收费", "路桥"], "交通出行"),
]


def categorize():
    db = SessionLocal()
    cats = {c.name: c.id for c in db.query(Category).all()}

    # Find uncategorized transactions in batches
    total = db.query(Transaction).filter(Transaction.category_id.is_(None)).count()
    print(f"未分类交易总数: {total}")

    categorized = 0
    batch_size = 500
    offset = 0

    while True:
        txns = (
            db.query(Transaction)
            .filter(Transaction.category_id.is_(None))
            .offset(offset)
            .limit(batch_size)
            .all()
        )
        if not txns:
            break

        for txn in txns:
            for field, keywords, cat_name in RULES:
                cat_id = cats.get(cat_name)
                if not cat_id:
                    continue

                val = (getattr(txn, field, "") or "").lower()
                if any(kw.lower() in val for kw in keywords):
                    txn.category_id = cat_id
                    categorized += 1
                    break

        db.commit()
        print(f"  已处理 {min(offset + batch_size, total)}/{total}, 已分类 {categorized}")
        offset += batch_size

    db.commit()

    # === Final fallback: assign remaining uncategorized to 其他* ===
    fallback_map = {
        "expense": "其他支出",
        "income": "其他收入",
        "neutral": "其他不计收支",
    }
    remaining_txns = (
        db.query(Transaction)
        .filter(Transaction.category_id.is_(None))
        .all()
    )
    fallback_count = 0
    for txn in remaining_txns:
        cat_name = fallback_map.get(txn.direction)
        if cat_name and cat_name in cats:
            txn.category_id = cats[cat_name]
            fallback_count += 1

    db.commit()
    remaining = db.query(Transaction).filter(Transaction.category_id.is_(None)).count()
    print(f"\n完成: {categorized} 笔关键词匹配, {fallback_count} 笔兜底分类")
    print(f"剩余 {remaining} 笔未分类")
    db.close()


if __name__ == "__main__":
    categorize()
