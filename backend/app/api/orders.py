import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.utils import paginate
from app.dependencies import get_current_user, get_db
from app.models.driver import Driver
from app.models.order import CapturedOrder
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.order import CapturedOrderResponse, HourlyDistribution, OrderSummaryResponse

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=PaginatedResponse[CapturedOrderResponse])
async def list_orders(
    date_from: date | None = None,
    date_to: date | None = None,
    driver_id: uuid.UUID | None = None,
    platform: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(CapturedOrder)
    if date_from:
        q = q.where(func.date(CapturedOrder.captured_at) >= date_from)
    if date_to:
        q = q.where(func.date(CapturedOrder.captured_at) <= date_to)
    if driver_id:
        q = q.where(CapturedOrder.driver_id == driver_id)
    if platform:
        q = q.where(CapturedOrder.platform == platform)
    q = q.order_by(CapturedOrder.captured_at.desc())

    result = await paginate(db, q, page, per_page)
    result["items"] = [CapturedOrderResponse.model_validate(o) for o in result["items"]]
    return result


@router.get("/summary", response_model=OrderSummaryResponse)
async def order_summary(
    date_val: date | None = Query(None, alias="date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_date = date_val or date.today()

    # Count by platform
    result = await db.execute(
        select(CapturedOrder.platform, func.count(), func.coalesce(func.sum(CapturedOrder.amount), 0))
        .where(func.date(CapturedOrder.captured_at) == target_date)
        .group_by(CapturedOrder.platform)
    )
    by_platform = {}
    by_platform_amount = {}
    total = 0
    total_amount = 0.0
    for platform, count, amount in result.all():
        by_platform[platform] = count
        by_platform_amount[platform] = float(amount)
        total += count
        total_amount += float(amount)

    # Top drivers
    top_q = (
        select(
            CapturedOrder.driver_id,
            Driver.name.label("driver_name"),
            func.count().label("count"),
        )
        .join(Driver, Driver.id == CapturedOrder.driver_id)
        .where(func.date(CapturedOrder.captured_at) == target_date)
        .group_by(CapturedOrder.driver_id, Driver.name)
        .order_by(func.count().desc())
        .limit(5)
    )
    top_result = await db.execute(top_q)
    top_drivers = [
        {"driver_id": str(r.driver_id), "driver_name": r.driver_name, "count": r.count}
        for r in top_result.all()
    ]

    return OrderSummaryResponse(
        date=target_date.isoformat(),
        total=total,
        by_platform=by_platform,
        total_amount=total_amount,
        by_platform_amount=by_platform_amount,
        top_drivers=top_drivers,
    )


@router.get("/hourly", response_model=list[HourlyDistribution])
async def hourly_distribution(
    date_val: date | None = Query(None, alias="date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_date = date_val or date.today()
    result = await db.execute(
        select(
            func.extract("hour", CapturedOrder.captured_at).label("hour"),
            func.count().label("count"),
        )
        .where(func.date(CapturedOrder.captured_at) == target_date)
        .group_by(func.extract("hour", CapturedOrder.captured_at))
        .order_by("hour")
    )
    hours = {int(r.hour): r.count for r in result.all()}
    return [HourlyDistribution(hour=h, count=hours.get(h, 0)) for h in range(24)]


@router.get("/driver/{driver_id}", response_model=PaginatedResponse[CapturedOrderResponse])
async def driver_orders(
    driver_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(CapturedOrder).where(CapturedOrder.driver_id == driver_id).order_by(CapturedOrder.captured_at.desc())
    result = await paginate(db, q, page, per_page)
    result["items"] = [CapturedOrderResponse.model_validate(o) for o in result["items"]]
    return result
