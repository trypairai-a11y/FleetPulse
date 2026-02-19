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
from app.models.cash import CashRecord
from app.models.driver import Driver
from app.models.user import User
from app.schemas.cash import CashRecordCreate, CashRecordResponse, CashRecordUpdate, CashSummaryResponse, OutstandingDriverResponse
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/cash", tags=["cash"])


@router.get("", response_model=PaginatedResponse[CashRecordResponse])
async def list_cash_records(
    date_from: date | None = None,
    date_to: date | None = None,
    driver_id: uuid.UUID | None = None,
    record_type: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(CashRecord)
    if date_from:
        q = q.where(CashRecord.date >= date_from)
    if date_to:
        q = q.where(CashRecord.date <= date_to)
    if driver_id:
        q = q.where(CashRecord.driver_id == driver_id)
    if record_type:
        q = q.where(CashRecord.record_type == record_type)
    if status_filter:
        q = q.where(CashRecord.status == status_filter)
    q = q.order_by(CashRecord.date.desc())

    result = await paginate(db, q, page, per_page)
    result["items"] = [CashRecordResponse.model_validate(r) for r in result["items"]]
    return result


@router.post("", response_model=CashRecordResponse, status_code=201)
async def create_cash_record(
    body: CashRecordCreate,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    record = CashRecord(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(record)
    await db.flush()
    return CashRecordResponse.model_validate(record)


@router.post("/deposit", response_model=CashRecordResponse, status_code=201)
async def create_deposit(
    body: CashRecordCreate,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    record = CashRecord(
        tenant_id=current_user.tenant_id,
        record_type="deposit",
        **body.model_dump(exclude={"record_type"}),
    )
    db.add(record)
    await db.flush()
    return CashRecordResponse.model_validate(record)


@router.put("/{record_id}", response_model=CashRecordResponse)
async def update_cash_record(
    record_id: uuid.UUID,
    body: CashRecordUpdate,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CashRecord).where(CashRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cash record not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(record, field, value)

    if body.status == "verified":
        record.verified_by = current_user.id

    return CashRecordResponse.model_validate(record)


@router.put("/{record_id}/reconcile", response_model=CashRecordResponse)
async def reconcile_cash(
    record_id: uuid.UUID,
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CashRecord).where(CashRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cash record not found")

    record.status = "verified"
    record.verified_by = current_user.id
    return CashRecordResponse.model_validate(record)


@router.get("/summary", response_model=CashSummaryResponse)
async def cash_summary(
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base = select(CashRecord)
    if date_from:
        base = base.where(CashRecord.date >= date_from)
    if date_to:
        base = base.where(CashRecord.date <= date_to)

    # Collected (collection type)
    collected = (await db.execute(
        select(func.coalesce(func.sum(CashRecord.amount), 0))
        .where(CashRecord.record_type == "collection")
        .where(CashRecord.date >= date_from if date_from else True)
        .where(CashRecord.date <= date_to if date_to else True)
    )).scalar() or 0

    # Deposited
    deposited = (await db.execute(
        select(func.coalesce(func.sum(CashRecord.amount), 0))
        .where(CashRecord.record_type == "deposit")
        .where(CashRecord.date >= date_from if date_from else True)
        .where(CashRecord.date <= date_to if date_to else True)
    )).scalar() or 0

    # Outstanding (pending collections)
    outstanding = (await db.execute(
        select(func.coalesce(func.sum(CashRecord.amount), 0))
        .where(CashRecord.record_type == "collection")
        .where(CashRecord.status == "pending")
    )).scalar() or 0

    # Verified
    verified = (await db.execute(
        select(func.coalesce(func.sum(CashRecord.amount), 0))
        .where(CashRecord.status == "verified")
        .where(CashRecord.date >= date_from if date_from else True)
        .where(CashRecord.date <= date_to if date_to else True)
    )).scalar() or 0

    return CashSummaryResponse(
        collected=float(collected),
        deposited=float(deposited),
        outstanding=float(outstanding),
        verified=float(verified),
    )


@router.get("/outstanding", response_model=list[OutstandingDriverResponse])
async def outstanding_drivers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(
            CashRecord.driver_id,
            Driver.name.label("driver_name"),
            func.sum(CashRecord.amount).label("amount"),
            func.min(CashRecord.date).label("oldest_date"),
        )
        .join(Driver, Driver.id == CashRecord.driver_id)
        .where(CashRecord.record_type == "collection")
        .where(CashRecord.status == "pending")
        .group_by(CashRecord.driver_id, Driver.name)
        .order_by(func.sum(CashRecord.amount).desc())
    )
    result = await db.execute(q)
    return [
        OutstandingDriverResponse(
            driver_id=str(r.driver_id),
            driver_name=r.driver_name,
            amount=float(r.amount),
            oldest_date=r.oldest_date.isoformat(),
        )
        for r in result.all()
    ]


@router.get("/export")
async def export_cash(
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(CashRecord).join(Driver, Driver.id == CashRecord.driver_id)
    if date_from:
        q = q.where(CashRecord.date >= date_from)
    if date_to:
        q = q.where(CashRecord.date <= date_to)
    q = q.add_columns(Driver.name).order_by(CashRecord.date.desc())

    result = await db.execute(q)
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Driver", "Type", "Amount", "Status", "Reference", "Notes"])
    for record, driver_name in rows:
        writer.writerow([record.date, driver_name, record.record_type, record.amount, record.status, record.reference_number or "", record.notes or ""])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cash.csv"},
    )
