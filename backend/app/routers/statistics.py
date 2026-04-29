"""Statistics endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import ApiResponse
from ..services.statistics_service import get_summary, get_by_period, get_by_category, get_trend, get_daily
from ..auth import get_current_user

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/summary")
def summary(
    start_date: str | None = None,
    end_date: str | None = None,
    source_platform: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ApiResponse(data=get_summary(db, start_date, end_date, source_platform, current_user.id))


@router.get("/by-period")
def by_period(
    granularity: str = Query("monthly", pattern="^(yearly|monthly|weekly)$"),
    start_date: str | None = None,
    end_date: str | None = None,
    direction: str | None = None,
    source_platform: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ApiResponse(data=get_by_period(db, granularity, start_date, end_date, direction, source_platform, current_user.id))


@router.get("/by-category")
def by_category(
    start_date: str | None = None,
    end_date: str | None = None,
    direction: str = "expense",
    source_platform: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ApiResponse(data=get_by_category(db, start_date, end_date, direction, source_platform, current_user.id))


@router.get("/trend")
def trend(
    granularity: str = Query("monthly", pattern="^(monthly|weekly)$"),
    months: int = Query(12, ge=1, le=60),
    category_id: int | None = None,
    source_platform: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ApiResponse(data=get_trend(db, granularity, months, category_id, source_platform, current_user.id))


@router.get("/daily")
def daily(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    direction: str | None = None,
    source_platform: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ApiResponse(data=get_daily(db, year, month, direction, source_platform, current_user.id))
