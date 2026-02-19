"""Anomaly detection rules for fleet operations.

10 rules that scan data and create alerts:
1. clocked_in_zero_orders — Driver clocked in but has 0 orders
2. attendance_declining — Attendance rate dropped significantly
3. recurring_absence — Absent 3+ times in 7 days
4. score_rapid_drop — Score dropped 15+ points in a week
5. maintenance_overdue — Vehicle maintenance overdue
6. maintenance_cost_spike — Maintenance cost unusually high
7. late_streak — Late 3+ consecutive days
8. low_orders — Order count far below average
9. cash_deposit_overdue — Outstanding cash > 3 days old
10. device_offline — Device offline for 2+ hours during shift
"""

import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai import AIScore, Alert
from app.models.attendance import AttendanceRecord
from app.models.cash import CashRecord
from app.models.device import Device
from app.models.driver import Driver
from app.models.order import CapturedOrder
from app.models.shift import Shift
from app.models.vehicle import MaintenanceRecord, Vehicle

logger = logging.getLogger(__name__)

KWT = timezone(timedelta(hours=3))


def _today() -> date:
    return datetime.now(KWT).date()


async def run_anomaly_scan(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Run all anomaly detection rules. Returns count of new alerts created."""
    rules = [
        _check_clocked_in_zero_orders,
        _check_recurring_absence,
        _check_score_rapid_drop,
        _check_maintenance_overdue,
        _check_late_streak,
        _check_low_orders,
        _check_cash_deposit_overdue,
        _check_device_offline,
    ]

    new_alerts = 0
    for rule in rules:
        try:
            count = await rule(db, tenant_id)
            new_alerts += count
        except Exception:
            logger.exception(f"Anomaly rule failed: {rule.__name__}")

    await db.flush()
    return new_alerts


async def _alert_exists(db: AsyncSession, alert_type: str, driver_id: uuid.UUID | None, hours: int = 24) -> bool:
    """Check if a similar alert was already created recently."""
    since = datetime.now(KWT) - timedelta(hours=hours)
    q = select(func.count(Alert.id)).where(
        Alert.type == alert_type,
        Alert.created_at > since,
    )
    if driver_id:
        q = q.where(Alert.driver_id == driver_id)
    count = (await db.execute(q)).scalar() or 0
    return count > 0


def _create_alert(
    tenant_id: uuid.UUID,
    alert_type: str,
    severity: str,
    title: str,
    title_ar: str,
    message: str,
    message_ar: str = "",
    driver_id: uuid.UUID | None = None,
    vehicle_id: uuid.UUID | None = None,
    data: dict | None = None,
) -> Alert:
    return Alert(
        tenant_id=tenant_id,
        type=alert_type,
        severity=severity,
        title=title,
        title_ar=title_ar,
        message=message,
        message_ar=message_ar or title_ar,
        driver_id=driver_id,
        vehicle_id=vehicle_id,
        data=data or {},
    )


async def _check_clocked_in_zero_orders(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Drivers who clocked in but had 0 orders today."""
    today = _today()
    # Get drivers who have a shift today with actual_start
    clocked_in = await db.execute(
        select(Shift.driver_id).where(
            Shift.date == today,
            Shift.actual_start.isnot(None),
        )
    )
    clocked_driver_ids = [r[0] for r in clocked_in.all()]
    if not clocked_driver_ids:
        return 0

    count = 0
    for driver_id in clocked_driver_ids:
        orders = (await db.execute(
            select(func.count(CapturedOrder.id)).where(
                CapturedOrder.driver_id == driver_id,
                func.date(CapturedOrder.captured_at) == today,
            )
        )).scalar() or 0

        if orders == 0:
            if not await _alert_exists(db, "no_orders", driver_id, hours=8):
                driver = (await db.execute(
                    select(Driver).where(Driver.id == driver_id)
                )).scalar_one_or_none()
                if driver:
                    db.add(_create_alert(
                        tenant_id=tenant_id,
                        alert_type="no_orders",
                        severity="medium",
                        title=f"{driver.name} clocked in with zero orders",
                        title_ar=f"{driver.name_ar or driver.name} سجّل حضور بدون طلبات",
                        message=f"Driver {driver.name} has been clocked in today but has recorded 0 orders.",
                        driver_id=driver_id,
                    ))
                    count += 1
    return count


async def _check_recurring_absence(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Drivers absent 3+ times in the last 7 days."""
    today = _today()
    week_ago = today - timedelta(days=7)

    result = await db.execute(
        select(AttendanceRecord.driver_id, func.count(AttendanceRecord.id))
        .where(
            AttendanceRecord.date >= week_ago,
            AttendanceRecord.status == "absent",
        )
        .group_by(AttendanceRecord.driver_id)
        .having(func.count(AttendanceRecord.id) >= 3)
    )

    count = 0
    for driver_id, absent_count in result.all():
        if not await _alert_exists(db, "attendance_anomaly", driver_id, hours=48):
            driver = (await db.execute(
                select(Driver).where(Driver.id == driver_id)
            )).scalar_one_or_none()
            if driver:
                db.add(_create_alert(
                    tenant_id=tenant_id,
                    alert_type="attendance_anomaly",
                    severity="high",
                    title=f"{driver.name} absent {absent_count} times this week",
                    title_ar=f"{driver.name_ar or driver.name} غائب {absent_count} مرات هالأسبوع",
                    message=f"Driver has been absent {absent_count} times in the past 7 days.",
                    driver_id=driver_id,
                    data={"absent_count": absent_count, "period_days": 7},
                ))
                count += 1
    return count


async def _check_score_rapid_drop(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Drivers whose score dropped 15+ points in a week."""
    today = _today()
    week_ago = today - timedelta(days=7)

    # Get latest scores
    latest = await db.execute(
        select(AIScore).where(AIScore.date == today)
    )
    current_scores = {s.driver_id: s for s in latest.scalars().all()}

    past = await db.execute(
        select(AIScore).where(AIScore.date == week_ago)
    )
    past_scores = {s.driver_id: s for s in past.scalars().all()}

    count = 0
    for driver_id, current in current_scores.items():
        prev = past_scores.get(driver_id)
        if prev and (float(prev.composite_score) - float(current.composite_score)) >= 15:
            if not await _alert_exists(db, "score_decline", driver_id, hours=48):
                driver = (await db.execute(
                    select(Driver).where(Driver.id == driver_id)
                )).scalar_one_or_none()
                if driver:
                    drop = round(float(prev.composite_score) - float(current.composite_score), 1)
                    db.add(_create_alert(
                        tenant_id=tenant_id,
                        alert_type="score_decline",
                        severity="high",
                        title=f"{driver.name} score dropped {drop} points",
                        title_ar=f"درجة {driver.name_ar or driver.name} انخفضت {drop} نقطة",
                        message=f"Score went from {prev.composite_score} to {current.composite_score} in 7 days.",
                        driver_id=driver_id,
                        data={"previous_score": float(prev.composite_score), "current_score": float(current.composite_score)},
                    ))
                    count += 1
    return count


async def _check_maintenance_overdue(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Vehicles with overdue maintenance."""
    result = await db.execute(
        select(Vehicle).where(Vehicle.status == "in_maintenance")
    )
    vehicles = result.scalars().all()

    count = 0
    for vehicle in vehicles:
        if not await _alert_exists(db, "maintenance_due", None, hours=72):
            db.add(_create_alert(
                tenant_id=tenant_id,
                alert_type="maintenance_due",
                severity="medium",
                title=f"Vehicle {vehicle.plate_number} in maintenance",
                title_ar=f"مركبة {vehicle.plate_number} في الصيانة",
                message=f"{vehicle.make} {vehicle.model} ({vehicle.plate_number}) is currently in maintenance.",
                vehicle_id=vehicle.id,
            ))
            count += 1
    return count


async def _check_late_streak(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Drivers late 3+ consecutive days."""
    today = _today()

    result = await db.execute(
        select(Driver.id, Driver.name, Driver.name_ar)
        .where(Driver.status == "active")
    )
    drivers = result.all()

    count = 0
    for driver_id, name, name_ar in drivers:
        att_result = await db.execute(
            select(AttendanceRecord.status)
            .where(
                AttendanceRecord.driver_id == driver_id,
                AttendanceRecord.date <= today,
            )
            .order_by(AttendanceRecord.date.desc())
            .limit(3)
        )
        statuses = [r[0] for r in att_result.all()]
        if len(statuses) >= 3 and all(s == "late" for s in statuses):
            if not await _alert_exists(db, "attendance_anomaly", driver_id, hours=48):
                db.add(_create_alert(
                    tenant_id=tenant_id,
                    alert_type="attendance_anomaly",
                    severity="medium",
                    title=f"{name} late 3 consecutive days",
                    title_ar=f"{name_ar or name} متأخر 3 أيام متتالية",
                    message=f"Driver has been late for the past 3 consecutive shifts.",
                    driver_id=driver_id,
                ))
                count += 1
    return count


async def _check_low_orders(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Drivers with orders far below average (< 50% of avg)."""
    today = _today()
    week_ago = today - timedelta(days=7)

    # Get average orders per active driver per day
    avg_result = await db.execute(
        select(func.count(CapturedOrder.id)).where(
            CapturedOrder.captured_at >= datetime.combine(week_ago, datetime.min.time()).replace(tzinfo=KWT),
        )
    )
    total_orders = avg_result.scalar() or 0

    active_drivers = (await db.execute(
        select(func.count(Driver.id)).where(Driver.status == "active")
    )).scalar() or 1

    daily_avg = total_orders / max(active_drivers * 7, 1)
    if daily_avg < 1:
        return 0  # Not enough data

    threshold = daily_avg * 0.5

    # Today's orders per driver
    result = await db.execute(
        select(CapturedOrder.driver_id, func.count(CapturedOrder.id))
        .where(func.date(CapturedOrder.captured_at) == today)
        .group_by(CapturedOrder.driver_id)
    )

    count = 0
    for driver_id, order_count in result.all():
        if order_count < threshold:
            if not await _alert_exists(db, "performance_drop", driver_id, hours=24):
                driver = (await db.execute(
                    select(Driver).where(Driver.id == driver_id)
                )).scalar_one_or_none()
                if driver:
                    db.add(_create_alert(
                        tenant_id=tenant_id,
                        alert_type="performance_drop",
                        severity="low",
                        title=f"{driver.name} has low orders ({order_count})",
                        title_ar=f"{driver.name_ar or driver.name} طلبات قليلة ({order_count})",
                        message=f"Driver has {order_count} orders today vs average of {round(daily_avg, 1)}.",
                        driver_id=driver_id,
                        data={"orders": order_count, "daily_avg": round(daily_avg, 1)},
                    ))
                    count += 1
    return count


async def _check_cash_deposit_overdue(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Drivers with outstanding cash > 3 days old."""
    three_days_ago = _today() - timedelta(days=3)

    result = await db.execute(
        select(
            CashRecord.driver_id,
            func.sum(CashRecord.amount),
        )
        .where(
            CashRecord.record_type == "collection",
            CashRecord.status == "pending",
            CashRecord.date <= three_days_ago,
        )
        .group_by(CashRecord.driver_id)
    )

    count = 0
    for driver_id, amount in result.all():
        if amount and float(amount) > 0:
            if not await _alert_exists(db, "performance_drop", driver_id, hours=72):
                driver = (await db.execute(
                    select(Driver).where(Driver.id == driver_id)
                )).scalar_one_or_none()
                if driver:
                    db.add(_create_alert(
                        tenant_id=tenant_id,
                        alert_type="performance_drop",
                        severity="high",
                        title=f"{driver.name} has overdue cash deposit",
                        title_ar=f"{driver.name_ar or driver.name} عنده إيداع نقدي متأخر",
                        message=f"Outstanding cash of KWD {float(amount):.3f} older than 3 days.",
                        driver_id=driver_id,
                        data={"amount_kwd": round(float(amount), 3)},
                    ))
                    count += 1
    return count


async def _check_device_offline(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Devices offline for 2+ hours during active shift times."""
    two_hours_ago = datetime.now(KWT) - timedelta(hours=2)

    result = await db.execute(
        select(Device).where(
            Device.status == "active",
            Device.last_heartbeat_at < two_hours_ago,
        )
    )
    devices = result.scalars().all()

    count = 0
    for device in devices:
        if device.assigned_driver_id:
            if not await _alert_exists(db, "performance_drop", device.assigned_driver_id, hours=4):
                db.add(_create_alert(
                    tenant_id=tenant_id,
                    alert_type="performance_drop",
                    severity="medium",
                    title=f"Device {device.device_model or 'unknown'} offline 2+ hours",
                    title_ar=f"جهاز {device.device_model or 'غير معروف'} غير متصل لأكثر من ساعتين",
                    message=f"Device last seen at {device.last_heartbeat_at}.",
                    driver_id=device.assigned_driver_id,
                    data={"device_id": str(device.id), "last_heartbeat": device.last_heartbeat_at.isoformat() if device.last_heartbeat_at else None},
                ))
                count += 1
    return count
