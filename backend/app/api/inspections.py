import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.vehicle import VehicleInspection
from app.models.user import User
from app.schemas.vehicle import InspectionCreate, InspectionResponse

router = APIRouter(prefix="/api/inspections", tags=["inspections"])


@router.get("", response_model=list[InspectionResponse])
async def list_inspections(
    vehicle_id: uuid.UUID | None = None,
    driver_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(VehicleInspection)
    if vehicle_id:
        q = q.where(VehicleInspection.vehicle_id == vehicle_id)
    if driver_id:
        q = q.where(VehicleInspection.driver_id == driver_id)

    q = q.order_by(VehicleInspection.inspected_at.desc())
    q = q.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(q)
    return [InspectionResponse.model_validate(i) for i in result.scalars().all()]
