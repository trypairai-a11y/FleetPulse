import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case, literal
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.driver import Driver
from app.models.location import LocationLog
from app.models.order import CapturedOrder
from app.models.shift import Shift
from app.models.user import User
from app.models.vehicle import Vehicle

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("/latest")
async def get_latest_locations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get latest location for each driver (for live map)."""
    today = date.today()

    # Subquery: latest location per driver
    subq = (
        select(
            LocationLog.driver_id,
            func.max(LocationLog.recorded_at).label("max_time"),
        )
        .group_by(LocationLog.driver_id)
        .subquery()
    )

    # Subquery: orders count today per driver
    orders_subq = (
        select(
            CapturedOrder.driver_id,
            func.count(CapturedOrder.id).label("orders_today"),
        )
        .where(func.date(CapturedOrder.captured_at) == today)
        .group_by(CapturedOrder.driver_id)
        .subquery()
    )

    # Subquery: current shift status per driver
    shift_subq = (
        select(
            Shift.driver_id,
            Shift.status.label("shift_status"),
        )
        .where(Shift.date == today)
        .where(Shift.status.in_(["active", "scheduled"]))
        .order_by(Shift.driver_id, Shift.scheduled_start.desc())
        .distinct(Shift.driver_id)
        .subquery()
    )

    result = await db.execute(
        select(
            LocationLog,
            Driver,
            Vehicle.vehicle_type,
            func.coalesce(orders_subq.c.orders_today, 0).label("orders_today"),
            shift_subq.c.shift_status,
        )
        .join(
            subq,
            (LocationLog.driver_id == subq.c.driver_id)
            & (LocationLog.recorded_at == subq.c.max_time),
        )
        .join(Driver, LocationLog.driver_id == Driver.id)
        .outerjoin(Vehicle, Driver.current_vehicle_id == Vehicle.id)
        .outerjoin(orders_subq, Driver.id == orders_subq.c.driver_id)
        .outerjoin(shift_subq, Driver.id == shift_subq.c.driver_id)
    )

    locations = []
    for row in result.all():
        loc = row[0]
        driver = row[1]
        vehicle_type = row[2]
        orders_today = row[3]
        shift_status = row[4]
        locations.append({
            "driver_id": str(loc.driver_id),
            "driver_name": driver.name,
            "driver_name_ar": driver.name_ar,
            "platform": driver.platform,
            "status": driver.status,
            "employee_id": driver.employee_id,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "speed": loc.speed,
            "bearing": loc.bearing,
            "vehicle_type": vehicle_type or "motorcycle",
            "recorded_at": loc.recorded_at.isoformat(),
            "orders_today": orders_today,
            "shift_status": shift_status or "off_duty",
        })

    return locations


@router.get("/driver/{driver_id}")
async def get_driver_locations(
    driver_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LocationLog)
        .where(LocationLog.driver_id == driver_id)
        .order_by(LocationLog.recorded_at.desc())
        .limit(limit)
    )

    return [
        {
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "speed": loc.speed,
            "accuracy": loc.accuracy,
            "recorded_at": loc.recorded_at.isoformat(),
        }
        for loc in result.scalars().all()
    ]
