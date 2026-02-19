import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_device, get_db
from app.models.device import Device, DeviceCommand
from app.models.order import CapturedOrder
from app.models.location import LocationLog
from app.models.shift import Shift
from app.models.attendance import AttendanceRecord
from app.models.vehicle import VehicleInspection, MaintenanceRecord
from app.models.cash import CashRecord
from app.models.location import AppUsageLog
from app.schemas.agent import (
    AppUsageSyncRequest, CashDepositRequest, ClockInRequest, ClockOutRequest,
    CommandResultRequest, HeartbeatRequest, InspectionSubmitRequest,
    LocationSyncRequest, MaintenanceRequestCreate, NotificationSyncRequest,
    SyncResponse,
)

router = APIRouter(prefix="/api/agent", tags=["agent"])


# ── Notification sync ──
@router.post("/sync/notifications", response_model=SyncResponse)
async def sync_notifications(
    body: NotificationSyncRequest,
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    """Batch upload captured notifications from delivery apps."""
    count = 0
    for notif in body.notifications:
        order = CapturedOrder(
            tenant_id=device.tenant_id,
            driver_id=device.assigned_driver_id,
            device_id=device.id,
            platform=_guess_platform(notif.app_package),
            raw_notification={
                "app_package": notif.app_package,
                "title": notif.title,
                "text": notif.text,
                "extras": notif.extras,
            },
            captured_at=notif.timestamp,
        )
        db.add(order)
        count += 1

    return SyncResponse(received=count)


# ── Location sync ──
@router.post("/sync/locations", response_model=SyncResponse)
async def sync_locations(
    body: LocationSyncRequest,
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    """Batch upload GPS points."""
    for point in body.points:
        loc = LocationLog(
            tenant_id=device.tenant_id,
            driver_id=device.assigned_driver_id,
            device_id=device.id,
            latitude=point.latitude,
            longitude=point.longitude,
            accuracy=point.accuracy,
            speed=point.speed,
            bearing=point.bearing,
            altitude=point.altitude,
            recorded_at=point.recorded_at,
        )
        db.add(loc)

    # Update device last known location
    if body.points:
        latest = body.points[-1]
        device.last_location_lat = latest.latitude
        device.last_location_lng = latest.longitude

    return SyncResponse(received=len(body.points))


# ── Heartbeat ──
@router.post("/sync/heartbeat", response_model=SyncResponse)
async def sync_heartbeat(
    body: HeartbeatRequest,
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    """Device health update."""
    device.last_heartbeat_at = datetime.now(timezone.utc)
    if body.battery_level is not None:
        device.battery_level = body.battery_level
    if body.app_version:
        device.app_version = body.app_version
    if body.os_version:
        device.os_version = body.os_version
    if body.latitude is not None and body.longitude is not None:
        device.last_location_lat = body.latitude
        device.last_location_lng = body.longitude

    return SyncResponse(received=1)


# ── App usage sync ──
@router.post("/sync/app-usage", response_model=SyncResponse)
async def sync_app_usage(
    body: AppUsageSyncRequest,
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    """Batch upload app usage records from Android agent."""
    count = 0
    for record in body.records:
        usage = AppUsageLog(
            tenant_id=device.tenant_id,
            driver_id=device.assigned_driver_id,
            device_id=device.id,
            app_package=record.app_package,
            app_name=record.app_name,
            event_type=record.event_type,
            duration_seconds=record.duration_seconds,
            recorded_at=record.recorded_at,
        )
        db.add(usage)
        count += 1

    return SyncResponse(received=count)


# ── Clock in ──
@router.post("/clockin")
async def clock_in(
    latitude: float = Form(...),
    longitude: float = Form(...),
    shift_id: uuid.UUID | None = Form(None),
    selfie: UploadFile | None = File(None),
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    """Clock in with selfie photo + GPS location."""
    selfie_url = None
    if selfie:
        # TODO: Upload to S3 in Phase 2 — for now just acknowledge
        selfie_url = f"/uploads/selfies/{device.assigned_driver_id}_{datetime.now(timezone.utc).isoformat()}"

    # Update shift if provided
    if shift_id:
        result = await db.execute(select(Shift).where(Shift.id == shift_id))
        shift = result.scalar_one_or_none()
        if shift:
            shift.actual_start = datetime.now(timezone.utc)
            shift.status = "active"
            shift.clock_in_method = "agent"
            shift.clock_in_selfie_url = selfie_url
            shift.clock_in_location_lat = latitude
            shift.clock_in_location_lng = longitude

    # Create attendance record
    attendance = AttendanceRecord(
        tenant_id=device.tenant_id,
        driver_id=device.assigned_driver_id,
        shift_id=shift_id,
        date=date.today(),
        status="present",
        actual_start=datetime.now(timezone.utc),
        source="agent",
        selfie_url=selfie_url,
        location_lat=latitude,
        location_lng=longitude,
    )
    db.add(attendance)

    return {"message": "Clocked in", "selfie_url": selfie_url}


# ── Clock out ──
@router.post("/clockout")
async def clock_out(
    body: ClockOutRequest,
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    """Clock out with GPS location."""
    if body.shift_id:
        result = await db.execute(select(Shift).where(Shift.id == body.shift_id))
        shift = result.scalar_one_or_none()
        if shift:
            shift.actual_end = datetime.now(timezone.utc)
            shift.status = "completed"
            shift.clock_out_method = "agent"
            shift.clock_out_location_lat = body.latitude
            shift.clock_out_location_lng = body.longitude

    return {"message": "Clocked out"}


# ── Vehicle inspection ──
@router.post("/inspection")
async def submit_inspection(
    vehicle_id: uuid.UUID = Form(...),
    shift_id: uuid.UUID | None = Form(None),
    checklist: str = Form("{}"),
    overall_status: str = Form("pass"),
    notes: str | None = Form(None),
    location_lat: float | None = Form(None),
    location_lng: float | None = Form(None),
    photos: list[UploadFile] = File([]),
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    """Vehicle inspection with photos."""
    import json
    photo_urls = []
    for photo in photos:
        # TODO: Upload to S3 in Phase 2
        url = f"/uploads/inspections/{device.assigned_driver_id}_{photo.filename}"
        photo_urls.append({"url": url, "filename": photo.filename})

    inspection = VehicleInspection(
        tenant_id=device.tenant_id,
        vehicle_id=vehicle_id,
        driver_id=device.assigned_driver_id,
        shift_id=shift_id,
        checklist=json.loads(checklist),
        photos=photo_urls,
        overall_status=overall_status,
        notes=notes,
        location_lat=location_lat,
        location_lng=location_lng,
    )
    db.add(inspection)
    await db.flush()

    return {"message": "Inspection submitted", "id": str(inspection.id)}


# ── Cash deposit ──
@router.post("/cash-deposit")
async def cash_deposit(
    amount: float = Form(...),
    deposit_location: str | None = Form(None),
    reference_number: str | None = Form(None),
    notes: str | None = Form(None),
    receipt: UploadFile | None = File(None),
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    """Cash deposit with receipt photo."""
    receipt_url = None
    if receipt:
        receipt_url = f"/uploads/receipts/{device.assigned_driver_id}_{receipt.filename}"

    from decimal import Decimal
    record = CashRecord(
        tenant_id=device.tenant_id,
        driver_id=device.assigned_driver_id,
        date=date.today(),
        record_type="deposit",
        amount=Decimal(str(amount)),
        receipt_url=receipt_url,
        deposit_location=deposit_location,
        reference_number=reference_number,
        notes=notes,
    )
    db.add(record)
    await db.flush()

    return {"message": "Cash deposit recorded", "id": str(record.id)}


# ── Maintenance request ──
@router.post("/maintenance-request")
async def maintenance_request(
    body: MaintenanceRequestCreate,
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    """Create a maintenance ticket from the driver's phone."""
    record = MaintenanceRecord(
        tenant_id=device.tenant_id,
        vehicle_id=body.vehicle_id,
        driver_id=device.assigned_driver_id,
        date=date.today(),
        category=body.category,
        type=body.type,
        description=body.description,
        cost=body.cost,
        source="agent",
    )
    db.add(record)
    await db.flush()

    return {"message": "Maintenance request created", "id": str(record.id)}


# ── Get pending commands ──
@router.get("/commands")
async def get_commands(
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    """Return pending MDM commands for this device."""
    result = await db.execute(
        select(DeviceCommand)
        .where(DeviceCommand.device_id == device.id, DeviceCommand.status == "pending")
        .order_by(DeviceCommand.issued_at.asc())
    )
    commands = result.scalars().all()
    return [
        {
            "id": str(cmd.id),
            "command_type": cmd.command_type,
            "payload": cmd.payload,
        }
        for cmd in commands
    ]


# ── Report command result ──
@router.post("/commands/{command_id}/result")
async def report_command_result(
    command_id: uuid.UUID,
    body: CommandResultRequest,
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DeviceCommand).where(
            DeviceCommand.id == command_id,
            DeviceCommand.device_id == device.id,
        )
    )
    cmd = result.scalar_one_or_none()
    if not cmd:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Command not found")

    cmd.status = "completed" if body.success else "failed"
    cmd.result = {"success": body.success, "output": body.output, "error": body.error}
    cmd.completed_at = datetime.now(timezone.utc)

    return {"message": "Command result recorded"}


# ── Get agent config ──
@router.get("/config")
async def get_config(
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    """Return agent configuration (parser rules, sync intervals)."""
    return {
        "sync_interval_seconds": 30,
        "location_interval_seconds": 10,
        "heartbeat_interval_seconds": 300,
        "monitored_apps": [
            "com.talabat.talabatcaptain",
            "com.keeta.driver",
            "com.deliveroo.rider",
            "com.jahez.driver",
        ],
        "device_config": device.config,
    }


def _guess_platform(app_package: str) -> str:
    """Map app package name to platform."""
    mapping = {
        "talabat": "talabat",
        "keeta": "keeta",
        "deliveroo": "deliveroo",
        "jahez": "jahez",
    }
    package_lower = app_package.lower()
    for key, platform in mapping.items():
        if key in package_lower:
            return platform
    return "unknown"
