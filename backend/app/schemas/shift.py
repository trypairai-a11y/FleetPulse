import uuid
from datetime import date, datetime, time

from pydantic import BaseModel


class ShiftTemplateCreate(BaseModel):
    name: str
    name_ar: str | None = None
    start_time: time
    end_time: time


class ShiftTemplateResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    name_ar: str | None
    start_time: time
    end_time: time
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ShiftCreate(BaseModel):
    driver_id: uuid.UUID
    template_id: uuid.UUID | None = None
    date: date
    scheduled_start: datetime
    scheduled_end: datetime
    notes: str | None = None


class ShiftUpdate(BaseModel):
    template_id: uuid.UUID | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    status: str | None = None
    notes: str | None = None


class ShiftResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    driver_id: uuid.UUID
    template_id: uuid.UUID | None
    date: date
    scheduled_start: datetime
    scheduled_end: datetime
    actual_start: datetime | None
    actual_end: datetime | None
    status: str
    clock_in_method: str | None
    clock_out_method: str | None
    clock_in_selfie_url: str | None
    clock_in_location_lat: float | None
    clock_in_location_lng: float | None
    clock_out_location_lat: float | None
    clock_out_location_lng: float | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ShiftTemplateUpdate(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    start_time: time | None = None
    end_time: time | None = None
    is_active: bool | None = None

class ShiftBulkAssign(BaseModel):
    driver_ids: list[str]
    template_id: str | None = None
    dates: list[str]

class ShiftCalendarDay(BaseModel):
    date: str
    shifts: list[dict]
