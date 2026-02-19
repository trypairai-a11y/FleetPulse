import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


# ── Notification sync ──
class NotificationItem(BaseModel):
    app_package: str
    title: str | None = None
    text: str | None = None
    timestamp: datetime
    extras: dict = {}


class NotificationSyncRequest(BaseModel):
    notifications: list[NotificationItem]


# ── Location sync ──
class LocationPoint(BaseModel):
    latitude: float
    longitude: float
    accuracy: float | None = None
    speed: float | None = None
    bearing: float | None = None
    altitude: float | None = None
    recorded_at: datetime


class LocationSyncRequest(BaseModel):
    points: list[LocationPoint]


# ── Heartbeat ──
class HeartbeatRequest(BaseModel):
    battery_level: int | None = None
    is_charging: bool | None = None
    network_type: str | None = None
    signal_strength: int | None = None
    storage_free_mb: int | None = None
    app_version: str | None = None
    os_version: str | None = None
    latitude: float | None = None
    longitude: float | None = None


# ── Clock in/out ──
class ClockInRequest(BaseModel):
    latitude: float
    longitude: float
    shift_id: uuid.UUID | None = None


class ClockOutRequest(BaseModel):
    latitude: float
    longitude: float
    shift_id: uuid.UUID | None = None


# ── Inspection ──
class InspectionSubmitRequest(BaseModel):
    vehicle_id: uuid.UUID
    shift_id: uuid.UUID | None = None
    checklist: dict = {}
    overall_status: str = "pass"
    notes: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None


# ── Cash deposit ──
class CashDepositRequest(BaseModel):
    amount: Decimal
    deposit_location: str | None = None
    reference_number: str | None = None
    notes: str | None = None


# ── Maintenance request ──
class MaintenanceRequestCreate(BaseModel):
    vehicle_id: uuid.UUID
    category: str = "unscheduled"
    type: str
    description: str | None = None
    cost: Decimal | None = None


# ── App usage sync ──
class AppUsageItem(BaseModel):
    app_package: str
    app_name: str | None = None
    event_type: str = "foreground"
    duration_seconds: int | None = None
    recorded_at: datetime


class AppUsageSyncRequest(BaseModel):
    records: list[AppUsageItem]


# ── Command result ──
class CommandResultRequest(BaseModel):
    success: bool
    output: str | None = None
    error: str | None = None


# ── Sync response ──
class SyncResponse(BaseModel):
    received: int
    message: str = "ok"
