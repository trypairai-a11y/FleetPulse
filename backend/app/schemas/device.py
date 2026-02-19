import uuid
from datetime import datetime

from pydantic import BaseModel


class DeviceCreate(BaseModel):
    device_model: str | None = None
    os_version: str | None = None
    app_version: str | None = None
    phone_number: str | None = None
    imei: str | None = None
    assigned_driver_id: uuid.UUID | None = None


class DeviceUpdate(BaseModel):
    device_model: str | None = None
    os_version: str | None = None
    app_version: str | None = None
    phone_number: str | None = None
    assigned_driver_id: uuid.UUID | None = None
    status: str | None = None
    config: dict | None = None


class DeviceResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    device_token: str
    device_model: str | None
    os_version: str | None
    app_version: str | None
    phone_number: str | None
    imei: str | None
    assigned_driver_id: uuid.UUID | None
    status: str
    battery_level: int | None
    last_heartbeat_at: datetime | None
    last_location_lat: float | None
    last_location_lng: float | None
    config: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DeviceCommandCreate(BaseModel):
    device_id: uuid.UUID
    command_type: str
    payload: dict = {}


class DeviceCommandResponse(BaseModel):
    id: uuid.UUID
    device_id: uuid.UUID
    command_type: str
    payload: dict
    status: str
    result: dict | None
    issued_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class BulkCommandRequest(BaseModel):
    device_ids: list[str]
    command_type: str
    payload: dict = {}
