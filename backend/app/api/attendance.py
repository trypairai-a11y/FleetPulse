import csv
import io
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.utils import paginate
from app.dependencies import get_current_user, get_db, require_role
from app.models.attendance import AttendanceRecord
from app.models.driver import Driver
from app.models.user import User
from app.schemas.attendance import AttendanceCreate, AttendanceResponse, AttendanceSummaryResponse, AttendanceUpdate
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.get("", response_model=PaginatedResponse[AttendanceResponse])
async def list_attendance(
    date_from: date | None = None,
    date_to: date | None = None,
    driver_id: uuid.UUID | None = None,
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(AttendanceRecord)
    if search:
        q = q.join(Driver, Driver.id == AttendanceRecord.driver_id).where(
            Driver.name.ilike(f"%{search}%") | Driver.name_ar.ilike(f"%{search}%")
        )
    if date_from:
        q = q.where(AttendanceRecord.date >= date_from)
    if date_to:
        q = q.where(AttendanceRecord.date <= date_to)
    if driver_id:
        q = q.where(AttendanceRecord.driver_id == driver_id)
    if status_filter:
        q = q.where(AttendanceRecord.status == status_filter)
    q = q.order_by(AttendanceRecord.date.desc())

    result = await paginate(db, q, page, per_page)
    result["items"] = [AttendanceResponse.model_validate(r) for r in result["items"]]
    return result


@router.post("", response_model=AttendanceResponse, status_code=201)
async def create_attendance(
    body: AttendanceCreate,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    record = AttendanceRecord(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(record)
    await db.flush()
    return AttendanceResponse.model_validate(record)


@router.put("/{record_id}", response_model=AttendanceResponse)
async def update_attendance(
    record_id: uuid.UUID,
    body: AttendanceUpdate,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AttendanceRecord).where(AttendanceRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attendance record not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(record, field, value)

    return AttendanceResponse.model_validate(record)


@router.get("/summary", response_model=AttendanceSummaryResponse)
async def attendance_summary(
    date_val: date | None = Query(None, alias="date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_date = date_val or date.today()
    result = await db.execute(
        select(AttendanceRecord.status, func.count())
        .where(AttendanceRecord.date == target_date)
        .group_by(AttendanceRecord.status)
    )
    summary = {row[0]: row[1] for row in result.all()}

    total = sum(summary.values())
    present_count = summary.get("present", 0) + summary.get("late", 0)
    attendance_rate = round((present_count / total * 100) if total > 0 else 0, 1)

    avg_late = (await db.execute(
        select(func.coalesce(func.avg(AttendanceRecord.late_minutes), 0))
        .where(AttendanceRecord.date == target_date)
        .where(AttendanceRecord.status == "late")
    )).scalar() or 0

    return AttendanceSummaryResponse(
        date=target_date.isoformat(),
        summary=summary,
        attendance_rate=attendance_rate,
        avg_late_minutes=round(float(avg_late), 1),
    )


@router.get("/driver/{driver_id}", response_model=PaginatedResponse[AttendanceResponse])
async def driver_attendance(
    driver_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(AttendanceRecord).where(AttendanceRecord.driver_id == driver_id).order_by(AttendanceRecord.date.desc())
    result = await paginate(db, q, page, per_page)
    result["items"] = [AttendanceResponse.model_validate(r) for r in result["items"]]
    return result


@router.get("/export")
async def export_attendance(
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(AttendanceRecord).join(Driver, Driver.id == AttendanceRecord.driver_id)
    if date_from:
        q = q.where(AttendanceRecord.date >= date_from)
    if date_to:
        q = q.where(AttendanceRecord.date <= date_to)
    q = q.add_columns(Driver.name).order_by(AttendanceRecord.date.desc())

    result = await db.execute(q)
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Driver", "Status", "Late Minutes", "Source", "Notes"])
    for record, driver_name in rows:
        writer.writerow([record.date, driver_name, record.status, record.late_minutes, record.source, record.notes or ""])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"},
    )
