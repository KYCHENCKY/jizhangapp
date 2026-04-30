"""File upload and import endpoints."""
import os
import json
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..config import UPLOAD_DIR
from ..models import ImportBatch, Transaction, User
from ..schemas import ImportBatchOut, ConfirmImportRequest, ConfirmAllRequest, ApiResponse
from ..auth import get_current_user
from ..services.parser_alipay import parse_alipay_csv
from ..services.parser_wechat import parse_wechat_xlsx
from ..services.category_service import auto_categorize

router = APIRouter(prefix="/upload", tags=["upload"])


def _preview_path(batch_id: int) -> str:
    return os.path.join(UPLOAD_DIR, f"batch_{batch_id}.json")


def _save_preview(batch_id: int, txns: list[dict]):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    data = [_serialize_txn(t) for t in txns]
    with open(_preview_path(batch_id), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, default=str)


def _load_preview(batch_id: int) -> list[dict]:
    path = _preview_path(batch_id)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for t in data:
        ts_str = t.get("transaction_time", "")
        if ts_str:
            try:
                t["transaction_time"] = datetime.fromisoformat(ts_str)
            except (ValueError, TypeError):
                pass
    return data


def _remove_preview(batch_id: int):
    path = _preview_path(batch_id)
    if os.path.exists(path):
        os.remove(path)


def _dedup(db: Session, txn_list: list[dict], platform: str, user_id: int) -> list[dict]:
    source_ids = [t["source_txn_id"] for t in txn_list if t.get("source_txn_id")]
    if not source_ids:
        return list(txn_list)
    existing = (
        db.query(Transaction.source_txn_id)
        .filter(
            Transaction.source_platform == platform,
            Transaction.source_txn_id.in_(source_ids),
            Transaction.user_id == user_id,
        )
        .all()
    )
    existing_ids = {r[0] for r in existing}
    return [t for t in txn_list if not t.get("source_txn_id") or t["source_txn_id"] not in existing_ids]


def _process_upload(file: UploadFile, platform: str, parse_fn, db: Session, file_bytes: bytes, user_id: int):
    # user_id is passed through to ImportBatch and Transaction creation
    if platform == "alipay":
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(400, "请上传 CSV 格式的支付宝账单文件")
    else:
        if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
            raise HTTPException(400, "请上传 XLSX 格式的微信账单文件")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_name = file.filename or "upload"
    filepath = os.path.join(UPLOAD_DIR, f"{platform}_{ts}_{safe_name}")
    with open(filepath, "wb") as f:
        f.write(file_bytes)

    try:
        result = parse_fn(file_bytes)
    except Exception as e:
        raise HTTPException(400, f"解析账单文件失败: {e}")

    txn_list = result["transactions"]
    if not txn_list:
        raise HTTPException(400, "未从文件中解析到任何交易记录，请确认文件格式正确")

    new_txns = _dedup(db, txn_list, platform, user_id)

    batch = ImportBatch(
        filename=safe_name,
        source_platform=platform,
        record_count=len(txn_list),
        new_count=len(new_txns),
        dup_count=len(txn_list) - len(new_txns),
        date_start=result.get("date_start") or "",
        date_end=result.get("date_end") or "",
        user_id=user_id,
    )
    db.add(batch)
    db.flush()
    db.refresh(batch)

    _save_preview(batch.id, new_txns)
    db.commit()

    return ApiResponse(data={
        "batch": ImportBatchOut.model_validate(batch).model_dump(),
        "preview": [_serialize_txn(t) for t in new_txns[:20]],
        "preview_total": len(new_txns),
    })


@router.post("/alipay")
async def upload_alipay(file: UploadFile = File(...), db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    file_bytes = await file.read()
    return _process_upload(file, "alipay", parse_alipay_csv, db, file_bytes, current_user.id)


@router.post("/wechat")
async def upload_wechat(file: UploadFile = File(...), db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    file_bytes = await file.read()
    return _process_upload(file, "wechat", parse_wechat_xlsx, db, file_bytes, current_user.id)


@router.post("/confirm")
def confirm_import(req: ConfirmImportRequest, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    batch = db.query(ImportBatch).filter(ImportBatch.id == req.batch_id).first()
    if not batch:
        raise HTTPException(404, "导入批次不存在，请重新上传文件")

    txns = _load_preview(req.batch_id)
    if not txns:
        raise HTTPException(400, "没有待确认的交易记录，请重新上传文件")

    # Re-dedup at confirm time: check DB + within-batch duplicates
    seen_ids: set[str] = set()
    new_txns: list[dict] = []
    all_source_ids = [t.get("source_txn_id", "") for t in txns if t.get("source_txn_id")]
    existing_ids: set[str] = set()
    if all_source_ids:
        existing_ids = set(
            r[0] for r in db.query(Transaction.source_txn_id).filter(
                Transaction.source_platform == batch.source_platform,
                Transaction.source_txn_id.in_(all_source_ids),
                Transaction.user_id == current_user.id,
            ).all()
        )
    for t_data in txns:
        sid = t_data.get("source_txn_id", "")
        if sid and (sid in existing_ids or sid in seen_ids):
            continue
        if sid:
            seen_ids.add(sid)
        new_txns.append(t_data)

    categorized = 0
    for t_data in new_txns:
        t_data.pop("transaction_time_display", None)
        try:
            txn = Transaction(**t_data, import_batch_id=batch.id, user_id=current_user.id)
            db.add(txn)
            db.flush()
            cat_id = auto_categorize(db, txn, current_user.id)
            if cat_id is not None:
                txn.category_id = cat_id
                categorized += 1
        except Exception as e:
            db.rollback()
            raise HTTPException(500, f"导入交易记录失败: {e}")

    batch.new_count = len(new_txns)
    batch.dup_count = batch.record_count - len(new_txns)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"保存交易记录失败（可能是重复导入）: {e}")

    _remove_preview(req.batch_id)

    return ApiResponse(data={"new_count": len(new_txns), "categorized": categorized})


@router.post("/confirm-all")
def confirm_all_imports(req: ConfirmAllRequest, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    """Confirm multiple import batches at once."""
    if not req.batch_ids:
        raise HTTPException(400, "请提供要导入的批次ID列表")

    total_new = 0
    total_categorized = 0
    errors = []

    for batch_id in req.batch_ids:
        batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
        if not batch:
            errors.append(f"批次 {batch_id} 不存在")
            continue

        txns = _load_preview(batch_id)
        if not txns:
            errors.append(f"批次 {batch_id} 没有待确认的交易记录")
            continue

        # Re-dedup at confirm time: check DB + within-batch duplicates
        seen_ids: set[str] = set()
        new_txns: list[dict] = []
        all_source_ids = [t.get("source_txn_id", "") for t in txns if t.get("source_txn_id")]
        existing_ids: set[str] = set()
        if all_source_ids:
            existing_ids = set(
                r[0] for r in db.query(Transaction.source_txn_id).filter(
                    Transaction.source_platform == batch.source_platform,
                    Transaction.source_txn_id.in_(all_source_ids),
                    Transaction.user_id == current_user.id,
                ).all()
            )
        for t_data in txns:
            sid = t_data.get("source_txn_id", "")
            if sid and (sid in existing_ids or sid in seen_ids):
                continue
            if sid:
                seen_ids.add(sid)
            new_txns.append(t_data)

        categorized = 0
        for t_data in new_txns:
            t_data.pop("transaction_time_display", None)
            try:
                txn = Transaction(**t_data, import_batch_id=batch.id, user_id=current_user.id)
                db.add(txn)
                db.flush()
                cat_id = auto_categorize(db, txn, current_user.id)
                if cat_id is not None:
                    txn.category_id = cat_id
                    categorized += 1
            except Exception as e:
                db.rollback()
                raise HTTPException(500, f"导入交易记录失败: {e}")

        batch.new_count = len(new_txns)
        batch.dup_count = batch.record_count - len(new_txns)
        total_new += len(new_txns)
        total_categorized += categorized
        _remove_preview(batch_id)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"保存交易记录失败（可能是重复导入）: {e}")

    result = {"new_count": total_new, "categorized": total_categorized}
    if errors:
        result["errors"] = errors
    return ApiResponse(data=result, message=f"导入完成！新增 {total_new} 条，自动分类 {total_categorized} 条")


@router.get("/batches")
def list_batches(db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    batches = db.query(ImportBatch).filter(
        ImportBatch.user_id == current_user.id
    ).order_by(ImportBatch.imported_at.desc()).all()
    return ApiResponse(data=[ImportBatchOut.model_validate(b).model_dump() for b in batches])


@router.delete("/batches/all")
def delete_all_batches(db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    """Delete all import batches and ALL transactions for current user."""
    batch_count = db.query(ImportBatch).filter(
        ImportBatch.user_id == current_user.id
    ).count()
    txn_deleted = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.query(ImportBatch).filter(
        ImportBatch.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    for f in os.listdir(UPLOAD_DIR):
        if f.startswith("batch_") and f.endswith(".json"):
            os.remove(os.path.join(UPLOAD_DIR, f))
    if batch_count == 0 and txn_deleted == 0:
        return ApiResponse(message="没有可删除的账单")
    return ApiResponse(data={"deleted_batches": batch_count, "deleted_transactions": txn_deleted},
                       message=f"已删除 {batch_count} 个批次，共 {txn_deleted} 条交易记录")


@router.delete("/batches/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    batch = db.query(ImportBatch).filter(
        ImportBatch.id == batch_id, ImportBatch.user_id == current_user.id
    ).first()
    if not batch:
        raise HTTPException(404, "导入批次不存在")
    deleted_txn = (
        db.query(Transaction)
        .filter(Transaction.import_batch_id == batch_id)
        .delete(synchronize_session=False)
    )
    db.delete(batch)
    db.commit()
    _remove_preview(batch_id)
    return ApiResponse(data={"deleted_transactions": deleted_txn}, message=f"已删除批次及 {deleted_txn} 条交易记录")


def _serialize_txn(t: dict) -> dict:
    return {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in t.items()}
