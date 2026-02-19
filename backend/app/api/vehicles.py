import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.utils import paginate
from app.dependencies import get_current_user, get_db, require_role
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.vehicle import VehicleCreate, VehicleResponse, VehicleUpdate

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])


@router.get("", response_model=PaginatedResponse[VehicleResponse])
async def list_vehicles(
    status_filter: str | None = Query(None, alias="status"),
    vehicle_type: str | None = None,
    ownership: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Vehicle)
    if status_filter:
        q = q.where(Vehicle.status == status_filter)
    if vehicle_type:
        q = q.where(Vehicle.vehicle_type == vehicle_type)
    if ownership:
        q = q.where(Vehicle.ownership == ownership)
    if search:
        q = q.where(
            Vehicle.plate_number.ilike(f"%{search}%")
            | Vehicle.make.ilike(f"%{search}%")
            | Vehicle.model.ilike(f"%{search}%")
        )
    q = q.order_by(Vehicle.created_at.desc())

    result = await paginate(db, q, page, per_page)
    result["items"] = [VehicleResponse.model_validate(v) for v in result["items"]]
    return result


@router.get("/spare", response_model=list[VehicleResponse])
async def spare_vehicles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Vehicle).where(
        Vehicle.status == "active",
        Vehicle.assigned_driver_id.is_(None),
    )
    result = await db.execute(q)
    return [VehicleResponse.model_validate(v) for v in result.scalars().all()]


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle not found")
    return VehicleResponse.model_validate(vehicle)


@router.post("", response_model=VehicleResponse, status_code=201)
async def create_vehicle(
    body: VehicleCreate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    vehicle = Vehicle(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(vehicle)
    await db.flush()
    return VehicleResponse.model_validate(vehicle)


@router.post("/{vehicle_id}/assign", response_model=VehicleResponse)
async def assign_driver(
    vehicle_id: uuid.UUID,
    driver_id: uuid.UUID = Query(...),
    current_user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle not found")

    driver_result = await db.execute(select(Driver).where(Driver.id == driver_id))
    driver = driver_result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver not found")

    vehicle.assigned_driver_id = driver_id
    driver.current_vehicle_id = vehicle_id
    return VehicleResponse.model_validate(vehicle)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: uuid.UUID,
    body: VehicleUpdate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, value)

    return VehicleResponse.model_validate(vehicle)


@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle not found")

    vehicle.status = "decommissioned"
    return {"message": "Vehicle decommissioned"}
