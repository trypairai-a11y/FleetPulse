import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_role
from app.models.vehicle import MaintenanceRecord
from app.models.user import User
from app.schemas.vehicle import MaintenanceCreate, MaintenanceResponse, MaintenanceUpdate

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


@router.get("", response_model=list[MaintenanceResponse])
async def list_maintenance(
    vehicle_id: uuid.UUID | None = None,
    category: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(MaintenanceRecord)
    if vehicle_id:
        q = q.where(MaintenanceRecord.vehicle_id == vehicle_id)
    if category:
        q = q.where(MaintenanceRecord.category == category)
    if status_filter:
        q = q.where(MaintenanceRecord.status == status_filter)

    q = q.order_by(MaintenanceRecord.created_at.desc())
    q = q.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(q)
    return [MaintenanceResponse.model_validate(r) for r in result.scalars().all()]


@router.post("", response_model=MaintenanceResponse, status_code=201)
async def create_maintenance(
    body: MaintenanceCreate,
    current_user: User = Depends(require_role("admin", "supervisor", "maintenance")),
    db: AsyncSession = Depends(get_db),
):
    record = MaintenanceRecord(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(record)
    await db.flush()
    return MaintenanceResponse.model_validate(record)


@router.get("/{record_id}", response_model=MaintenanceResponse)
async def get_maintenance(
    record_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MaintenanceRecord).where(MaintenanceRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Maintenance record not found")
    return MaintenanceResponse.model_validate(record)


@router.put("/{record_id}", response_model=MaintenanceResponse)
async def update_maintenance(
    record_id: uuid.UUID,
    body: MaintenanceUpdate,
    current_user: User = Depends(require_role("admin", "supervisor", "maintenance")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MaintenanceRecord).where(MaintenanceRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Maintenance record not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(record, field, value)

    return MaintenanceResponse.model_validate(record)
