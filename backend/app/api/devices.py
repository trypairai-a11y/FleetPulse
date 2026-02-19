import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.utils import paginate
from app.dependencies import get_current_user, get_db, require_role
from app.models.device import Device, DeviceCommand
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.device import (
    BulkCommandRequest, DeviceCommandCreate, DeviceCommandResponse,
    DeviceCreate, DeviceResponse, DeviceUpdate,
)
from app.services.auth_service import create_device_token

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=PaginatedResponse[DeviceResponse])
async def list_devices(
    status_filter: str | None = Query(None, alias="status"),
    driver_id: uuid.UUID | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Device)
    if status_filter:
        q = q.where(Device.status == status_filter)
    if driver_id:
        q = q.where(Device.assigned_driver_id == driver_id)
    if search:
        q = q.where(
            Device.device_model.ilike(f"%{search}%")
            | Device.phone_number.ilike(f"%{search}%")
            | Device.imei.ilike(f"%{search}%")
        )
    q = q.order_by(Device.created_at.desc())

    result = await paginate(db, q, page, per_page)
    result["items"] = [DeviceResponse.model_validate(d) for d in result["items"]]
    return result


@router.post("", response_model=DeviceResponse, status_code=201)
async def create_device(
    body: DeviceCreate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    device = Device(
        tenant_id=current_user.tenant_id,
        device_token=secrets.token_urlsafe(32),
        **body.model_dump(),
    )
    db.add(device)
    await db.flush()
    return DeviceResponse.model_validate(device)


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Device not found")
    return DeviceResponse.model_validate(device)


@router.get("/{device_id}/commands", response_model=list[DeviceCommandResponse])
async def device_commands(
    device_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DeviceCommand)
        .where(DeviceCommand.device_id == device_id)
        .order_by(DeviceCommand.issued_at.desc())
    )
    return [DeviceCommandResponse.model_validate(c) for c in result.scalars().all()]


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: uuid.UUID,
    body: DeviceUpdate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Device not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(device, field, value)

    return DeviceResponse.model_validate(device)


@router.delete("/{device_id}")
async def delete_device(
    device_id: uuid.UUID,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Device not found")

    device.status = "decommissioned"
    return {"message": "Device decommissioned"}


@router.post("/{device_id}/token")
async def generate_device_token(
    device_id: uuid.UUID,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Device not found")

    token = create_device_token(device.id, device.tenant_id)
    return {"device_token": token}


@router.post("/commands", response_model=DeviceCommandResponse, status_code=201)
async def create_command(
    body: DeviceCommandCreate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    cmd = DeviceCommand(
        tenant_id=current_user.tenant_id,
        device_id=body.device_id,
        command_type=body.command_type,
        payload=body.payload,
        issued_by=current_user.id,
    )
    db.add(cmd)
    await db.flush()
    return DeviceCommandResponse.model_validate(cmd)


@router.post("/bulk-command", status_code=201)
async def bulk_command(
    body: BulkCommandRequest,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    created = 0
    for device_id_str in body.device_ids:
        cmd = DeviceCommand(
            tenant_id=current_user.tenant_id,
            device_id=uuid.UUID(device_id_str),
            command_type=body.command_type,
            payload=body.payload or {},
            issued_by=current_user.id,
        )
        db.add(cmd)
        created += 1
    await db.flush()
    return {"message": f"{created} commands created"}
