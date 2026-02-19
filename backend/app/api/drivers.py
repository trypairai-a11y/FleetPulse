import csv
import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.utils import paginate
from app.dependencies import get_current_user, get_db, require_role
from app.models.attendance import AttendanceRecord
from app.models.cash import CashRecord
from app.models.driver import Driver
from app.models.order import CapturedOrder
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.driver import (
    DriverCreate, DriverImportResponse, DriverLeaderboardEntry,
    DriverResponse, DriverStatsResponse, DriverUpdate,
)

router = APIRouter(prefix="/api/drivers", tags=["drivers"])


@router.get("", response_model=PaginatedResponse[DriverResponse])
async def list_drivers(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    platform: str | None = None,
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Driver).where(Driver.is_active == True)
    if status_filter:
        q = q.where(Driver.status == status_filter)
    if platform:
        q = q.where(Driver.platform == platform)
    if search:
        q = q.where(
            Driver.name.ilike(f"%{search}%")
            | Driver.name_ar.ilike(f"%{search}%")
            | Driver.phone.ilike(f"%{search}%")
        )
    q = q.order_by(Driver.created_at.desc())

    result = await paginate(db, q, page, per_page)
    result["items"] = [DriverResponse.model_validate(d) for d in result["items"]]
    return result


@router.get("/leaderboard", response_model=list[DriverLeaderboardEntry])
async def driver_leaderboard(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(
            Driver.id.label("driver_id"),
            Driver.name.label("driver_name"),
            Driver.platform,
            func.count(CapturedOrder.id).label("order_count"),
        )
        .join(CapturedOrder, CapturedOrder.driver_id == Driver.id)
        .where(Driver.is_active == True)
        .group_by(Driver.id, Driver.name, Driver.platform)
        .order_by(func.count(CapturedOrder.id).desc())
        .limit(limit)
    )
    result = await db.execute(q)
    return [
        DriverLeaderboardEntry(
            driver_id=str(row.driver_id),
            driver_name=row.driver_name,
            platform=row.platform,
            order_count=row.order_count,
        )
        for row in result.all()
    ]


@router.get("/{driver_id}", response_model=DriverResponse)
async def get_driver(
    driver_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver not found")
    return DriverResponse.model_validate(driver)


@router.get("/{driver_id}/stats", response_model=DriverStatsResponse)
async def get_driver_stats(
    driver_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Order count
    order_count = (await db.execute(
        select(func.count()).select_from(CapturedOrder).where(CapturedOrder.driver_id == driver_id)
    )).scalar() or 0

    # Attendance rate
    total_att = (await db.execute(
        select(func.count()).select_from(AttendanceRecord).where(AttendanceRecord.driver_id == driver_id)
    )).scalar() or 0
    present_att = (await db.execute(
        select(func.count()).select_from(AttendanceRecord)
        .where(AttendanceRecord.driver_id == driver_id)
        .where(AttendanceRecord.status.in_(["present", "late"]))
    )).scalar() or 0
    attendance_rate = round((present_att / total_att * 100) if total_att > 0 else 0, 1)

    # Outstanding cash
    outstanding = (await db.execute(
        select(func.coalesce(func.sum(CashRecord.amount), 0))
        .where(CashRecord.driver_id == driver_id)
        .where(CashRecord.record_type == "collection")
        .where(CashRecord.status == "pending")
    )).scalar() or 0

    return DriverStatsResponse(
        order_count=order_count,
        attendance_rate=attendance_rate,
        outstanding_cash=float(outstanding),
    )


@router.post("", response_model=DriverResponse, status_code=201)
async def create_driver(
    body: DriverCreate,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    driver = Driver(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(driver)
    await db.flush()
    return DriverResponse.model_validate(driver)


@router.post("/import", response_model=DriverImportResponse)
async def import_drivers(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    created = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        try:
            name = row.get("name", "").strip()
            phone = row.get("phone", "").strip()
            if not name or not phone:
                errors.append(f"Row {i}: name and phone are required")
                continue

            driver = Driver(
                tenant_id=current_user.tenant_id,
                name=name,
                name_ar=row.get("name_ar", "").strip() or None,
                phone=phone,
                email=row.get("email", "").strip() or None,
                employee_id=row.get("employee_id", "").strip() or None,
                platform=row.get("platform", "").strip() or None,
                nationality=row.get("nationality", "").strip() or None,
            )
            db.add(driver)
            created += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    if created:
        await db.flush()

    return DriverImportResponse(created=created, errors=errors)


@router.put("/{driver_id}", response_model=DriverResponse)
async def update_driver(
    driver_id: uuid.UUID,
    body: DriverUpdate,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(driver, field, value)

    return DriverResponse.model_validate(driver)


@router.delete("/{driver_id}")
async def delete_driver(
    driver_id: uuid.UUID,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver not found")

    driver.status = "terminated"
    driver.is_active = False
    return {"message": "Driver terminated"}
