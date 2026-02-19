import uuid
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.utils import paginate
from app.dependencies import get_current_user, get_db, require_role
from app.models.driver import Driver
from app.models.shift import Shift, ShiftTemplate
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.shift import (
    ShiftBulkAssign, ShiftCalendarDay, ShiftCreate, ShiftResponse,
    ShiftTemplateCreate, ShiftTemplateResponse, ShiftTemplateUpdate, ShiftUpdate,
)

router = APIRouter(prefix="/api/shifts", tags=["shifts"])


# ── Shift Templates ──
@router.get("/templates", response_model=list[ShiftTemplateResponse])
async def list_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ShiftTemplate).where(ShiftTemplate.is_active == True).order_by(ShiftTemplate.start_time)
    )
    return [ShiftTemplateResponse.model_validate(t) for t in result.scalars().all()]


@router.post("/templates", response_model=ShiftTemplateResponse, status_code=201)
async def create_template(
    body: ShiftTemplateCreate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    template = ShiftTemplate(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(template)
    await db.flush()
    return ShiftTemplateResponse.model_validate(template)


@router.put("/templates/{template_id}", response_model=ShiftTemplateResponse)
async def update_template(
    template_id: uuid.UUID,
    body: ShiftTemplateUpdate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ShiftTemplate).where(ShiftTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(template, field, value)

    return ShiftTemplateResponse.model_validate(template)


@router.delete("/templates/{template_id}")
async def deactivate_template(
    template_id: uuid.UUID,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ShiftTemplate).where(ShiftTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")

    template.is_active = False
    return {"message": "Template deactivated"}


# ── Shifts ──
@router.get("", response_model=PaginatedResponse[ShiftResponse])
async def list_shifts(
    date_from: date | None = None,
    date_to: date | None = None,
    driver_id: uuid.UUID | None = None,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Shift)
    if date_from:
        q = q.where(Shift.date >= date_from)
    if date_to:
        q = q.where(Shift.date <= date_to)
    if driver_id:
        q = q.where(Shift.driver_id == driver_id)
    if status_filter:
        q = q.where(Shift.status == status_filter)
    q = q.order_by(Shift.date.desc(), Shift.scheduled_start.desc())

    result = await paginate(db, q, page, per_page)
    result["items"] = [ShiftResponse.model_validate(s) for s in result["items"]]
    return result


@router.get("/calendar", response_model=list[ShiftCalendarDay])
async def shift_calendar(
    date_from: date = Query(...),
    date_to: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Shift, Driver.name.label("driver_name"))
        .join(Driver, Driver.id == Shift.driver_id)
        .where(Shift.date >= date_from, Shift.date <= date_to)
        .order_by(Shift.date, Shift.scheduled_start)
    )
    result = await db.execute(q)

    days: dict[str, list] = {}
    for shift, driver_name in result.all():
        d = shift.date.isoformat()
        if d not in days:
            days[d] = []
        shift_data = ShiftResponse.model_validate(shift).model_dump()
        shift_data["driver_name"] = driver_name
        days[d].append(shift_data)

    # Fill in empty days
    current = date_from
    all_days = []
    while current <= date_to:
        d = current.isoformat()
        all_days.append(ShiftCalendarDay(date=d, shifts=days.get(d, [])))
        current += timedelta(days=1)

    return all_days


@router.post("", response_model=ShiftResponse, status_code=201)
async def create_shift(
    body: ShiftCreate,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    shift = Shift(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(shift)
    await db.flush()
    return ShiftResponse.model_validate(shift)


@router.post("/bulk", status_code=201)
async def bulk_assign_shifts(
    body: ShiftBulkAssign,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    # Get template for times
    template = None
    if body.template_id:
        result = await db.execute(select(ShiftTemplate).where(ShiftTemplate.id == uuid.UUID(body.template_id)))
        template = result.scalar_one_or_none()

    created = 0
    for driver_id_str in body.driver_ids:
        for date_str in body.dates:
            shift_date = date.fromisoformat(date_str)
            if template:
                scheduled_start = datetime.combine(shift_date, template.start_time, tzinfo=timezone.utc)
                scheduled_end = datetime.combine(shift_date, template.end_time, tzinfo=timezone.utc)
                if template.end_time <= template.start_time:
                    scheduled_end += timedelta(days=1)
            else:
                scheduled_start = datetime.combine(shift_date, time(6, 0), tzinfo=timezone.utc)
                scheduled_end = datetime.combine(shift_date, time(14, 0), tzinfo=timezone.utc)

            shift = Shift(
                tenant_id=current_user.tenant_id,
                driver_id=uuid.UUID(driver_id_str),
                template_id=uuid.UUID(body.template_id) if body.template_id else None,
                date=shift_date,
                scheduled_start=scheduled_start,
                scheduled_end=scheduled_end,
            )
            db.add(shift)
            created += 1

    await db.flush()
    return {"message": f"{created} shifts created"}


@router.get("/{shift_id}", response_model=ShiftResponse)
async def get_shift(
    shift_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Shift).where(Shift.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shift not found")
    return ShiftResponse.model_validate(shift)


@router.put("/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    shift_id: uuid.UUID,
    body: ShiftUpdate,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Shift).where(Shift.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shift not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(shift, field, value)

    return ShiftResponse.model_validate(shift)


@router.post("/{shift_id}/clockin", response_model=ShiftResponse)
async def clock_in(
    shift_id: uuid.UUID,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Shift).where(Shift.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shift not found")
    if shift.actual_start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Already clocked in")

    shift.actual_start = datetime.now(timezone.utc)
    shift.clock_in_method = "dashboard"
    shift.status = "in_progress"
    return ShiftResponse.model_validate(shift)


@router.post("/{shift_id}/clockout", response_model=ShiftResponse)
async def clock_out(
    shift_id: uuid.UUID,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Shift).where(Shift.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shift not found")
    if not shift.actual_start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not clocked in yet")
    if shift.actual_end:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Already clocked out")

    shift.actual_end = datetime.now(timezone.utc)
    shift.clock_out_method = "dashboard"
    shift.status = "completed"
    return ShiftResponse.model_validate(shift)


@router.delete("/{shift_id}")
async def cancel_shift(
    shift_id: uuid.UUID,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Shift).where(Shift.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shift not found")

    shift.status = "cancelled"
    return {"message": "Shift cancelled"}
