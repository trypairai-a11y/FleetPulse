import uuid
from datetime import date, datetime

from pydantic import BaseModel


class DriverCreate(BaseModel):
    employee_id: str | None = None
    name: str
    name_ar: str | None = None
    phone: str
    email: str | None = None
    status: str = "active"
    hire_date: date | None = None
    nationality: str | None = None
    license_number: str | None = None
    license_expiry: date | None = None
    license_group: str | None = None
    platform: str | None = None
    current_vehicle_id: uuid.UUID | None = None
    notes: str | None = None
    photo_url: str | None = None


class DriverUpdate(BaseModel):
    employee_id: str | None = None
    name: str | None = None
    name_ar: str | None = None
    phone: str | None = None
    email: str | None = None
    status: str | None = None
    hire_date: date | None = None
    nationality: str | None = None
    license_number: str | None = None
    license_expiry: date | None = None
    license_group: str | None = None
    platform: str | None = None
    current_vehicle_id: uuid.UUID | None = None
    device_id: uuid.UUID | None = None
    notes: str | None = None
    photo_url: str | None = None


class DriverResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    employee_id: str | None
    name: str
    name_ar: str | None
    phone: str
    email: str | None
    status: str
    hire_date: date | None
    nationality: str | None
    license_number: str | None
    license_expiry: date | None
    license_group: str | None
    platform: str | None
    current_vehicle_id: uuid.UUID | None
    device_id: uuid.UUID | None
    notes: str | None
    photo_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DriverStatsResponse(BaseModel):
    order_count: int
    attendance_rate: float
    outstanding_cash: float

class DriverLeaderboardEntry(BaseModel):
    driver_id: str
    driver_name: str
    platform: str | None
    order_count: int

class DriverImportResponse(BaseModel):
    created: int
    errors: list[str]
