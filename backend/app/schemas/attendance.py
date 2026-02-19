import uuid
from datetime import date, datetime

from pydantic import BaseModel


class AttendanceCreate(BaseModel):
    driver_id: uuid.UUID
    shift_id: uuid.UUID | None = None
    date: date
    status: str
    scheduled_start: datetime | None = None
    actual_start: datetime | None = None
    late_minutes: int = 0
    source: str = "manual"
    notes: str | None = None


class AttendanceUpdate(BaseModel):
    status: str | None = None
    actual_start: datetime | None = None
    late_minutes: int | None = None
    notes: str | None = None


class AttendanceResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    driver_id: uuid.UUID
    shift_id: uuid.UUID | None
    date: date
    status: str
    scheduled_start: datetime | None
    actual_start: datetime | None
    late_minutes: int
    source: str
    selfie_url: str | None
    location_lat: float | None
    location_lng: float | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AttendanceSummaryResponse(BaseModel):
    date: str
    summary: dict[str, int]
    attendance_rate: float
    avg_late_minutes: float
