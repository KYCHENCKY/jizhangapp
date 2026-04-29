"""Parse Alipay CSV export files."""
import re
import io
from datetime import datetime

import pandas as pd


COLUMN_MAP = {
    "交易时间": "transaction_time",
    "交易分类": "transaction_type",
    "交易对方": "counterparty",
    "商品说明": "product_desc",
    "收/支": "direction_raw",
    "金额": "amount_str",
    "收/支方式": "payment_method",
    "交易状态": "status",
    "交易订单号": "source_txn_id",
    "商家订单号": "merchant_order",
    "备注": "notes",
}

DIRECTION_MAP = {
    "收入": "income",
    "已收入": "income",
    "支出": "expense",
    "已支出": "expense",
    "不计收支": "neutral",
    "不收不支": "neutral",
    "不计": "neutral",
    "不统计": "neutral",
}


def _normalize_direction(raw: str) -> str | None:
    """Normalize direction string, handling encoding and whitespace variants."""
    cleaned = raw.strip().replace("\t", "").replace(" ", "").replace("　", "")
    if not cleaned:
        return None
    # Exact match first
    if cleaned in DIRECTION_MAP:
        return DIRECTION_MAP[cleaned]
    # Fuzzy match: check if the string contains keywords
    if "不计" in cleaned or "不统计" in cleaned or "不收不支" in cleaned:
        return "neutral"
    if "收入" in cleaned:
        return "income"
    if "支出" in cleaned:
        return "expense"
    return None


def _detect_encoding(file_bytes: bytes) -> str:
    """Try common encodings for Alipay exports."""
    candidates = ["utf-8", "utf-8-sig", "gb18030", "gbk", "gb2312"]
    for enc in candidates:
        try:
            file_bytes.decode(enc)
            return enc
        except (UnicodeDecodeError, LookupError):
            continue

    # Fallback to chardet
    try:
        import chardet
        detected = chardet.detect(file_bytes)
        enc = detected.get("encoding", "gb18030") or "gb18030"
        if enc.lower() in ("gb2312", "gbk"):
            return "gb18030"
        return enc
    except ImportError:
        return "gb18030"


def parse_alipay_csv(file_bytes: bytes) -> dict:
    encoding = _detect_encoding(file_bytes)
    text = file_bytes.decode(encoding, errors="replace")
    lines = text.splitlines()

    # Find header row
    header_idx = None
    for i, line in enumerate(lines):
        if "交易时间" in line:
            header_idx = i
            break

    if header_idx is None:
        raise ValueError(
            "未找到表头行（包含'交易时间'），请确认这是支付宝导出的账单CSV文件。"
            "在支付宝App中：我的 → 账单 → 开具交易流水证明 → 申请解压后获取CSV文件。"
        )

    # Extract date range from metadata
    date_start, date_end = None, None
    full_text = "\n".join(lines[:header_idx])
    m = re.search(r"起始时间.*?\[([\d-]+).*?\].*?终止时间.*?\[([\d-]+).*?\]", full_text, re.DOTALL)
    if m:
        date_start = m.group(1)
        date_end = m.group(2)

    # Parse CSV data
    csv_text = "\n".join(lines[header_idx:])
    try:
        df = pd.read_csv(io.StringIO(csv_text), dtype=str, keep_default_na=False)
    except Exception as e:
        raise ValueError(f"CSV 解析失败: {e}。请确认文件为支付宝导出的标准CSV格式。")

    # Drop extra unnamed columns
    extra_cols = [c for c in df.columns if c.startswith("Unnamed:")]
    if extra_cols:
        df = df.drop(columns=extra_cols, errors="ignore")

    # Rename columns
    rename = {}
    for cn, en in COLUMN_MAP.items():
        if cn in df.columns:
            rename[cn] = en
    df = df.rename(columns=rename)

    required = ["transaction_time", "direction_raw", "amount_str"]
    if not all(c in df.columns for c in required):
        missing = [c for c in required if c not in df.columns]
        found = list(df.columns)
        raise ValueError(
            f"缺少必要列: {missing}。已找到的列: {found}。"
            "请确认这是支付宝账单的原始CSV文件，并且文件没有被修改过。"
        )

    transactions = []
    skipped = 0
    for _, row in df.iterrows():
        ts_str = str(row.get("transaction_time", "")).strip()
        if not ts_str or ts_str == "nan":
            skipped += 1
            continue
        try:
            ts = datetime.strptime(ts_str[:19], "%Y-%m-%d %H:%M:%S")
        except ValueError:
            skipped += 1
            continue

        dir_raw = str(row.get("direction_raw", ""))
        direction = _normalize_direction(dir_raw)
        if direction is None:
            skipped += 1
            continue

        amount_str = str(row.get("amount_str", "")).strip().replace(",", "").replace(" ", "").replace("¥", "")
        try:
            amount = abs(float(amount_str))
        except ValueError:
            skipped += 1
            continue

        status = str(row.get("status", "")).strip()
        if status == "nan":
            status = ""

        transactions.append({
            "transaction_time": ts,
            "source_platform": "alipay",
            "transaction_type": str(row.get("transaction_type", "")).strip(),
            "counterparty": str(row.get("counterparty", "")).strip(),
            "product_desc": str(row.get("product_desc", "")).strip(),
            "direction": direction,
            "amount": amount,
            "payment_method": str(row.get("payment_method", "")).strip(),
            "status": status,
            "source_txn_id": str(row.get("source_txn_id", "")).strip().replace("\t", "").replace(" ", ""),
            "merchant_order": str(row.get("merchant_order", "")).strip(),
            "notes": str(row.get("notes", "")).strip(),
        })

    if not transactions:
        raise ValueError(
            f"成功解析 {len(df)} 行数据，但未能提取到有效交易记录（跳过 {skipped} 行）。"
            "请确认文件中包含有效的交易数据。"
        )

    return {
        "source_platform": "alipay",
        "transactions": transactions,
        "record_count": len(transactions),
        "date_start": date_start or "",
        "date_end": date_end or "",
    }
