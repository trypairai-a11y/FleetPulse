"""Driver performance scoring algorithm.

Weights:
  - Attendance: 30%
  - Punctuality: 20%
  - Orders/Performance: 25%
  - Active hours: 15%
  - Maintenance: 10%

Adjustments:
  - Streak bonus: +5 for 7+ consecutive present days
  - Trend: +3 improving, -3 declining
  - Anomaly penalty: -10 for active critical alerts
"""

import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai import AIScore, Alert
from app.models.attendance import AttendanceRecord
from app.models.driver import Driver
from app.models.order import CapturedOrder
from app.models.shift import Shift
from app.models.vehicle import MaintenanceRecord

logger = logging.getLogger(__name__)

KWT = timezone(timedelta(hours=3))


def _today() -> date:
    return datetime.now(KWT).date()


async def compute_all_driver_scores(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Compute scores for all active drivers in a tenant. Returns count."""
    result = await db.execute(
        select(Driver).where(Driver.status == "active", Driver.is_active == True)
    )
    drivers = result.scalars().all()

    count = 0
    today = _today()

    for driver in drivers:
        try:
            score = await _compute_single_driver(db, driver, today)
            if score:
                db.add(score)
                count += 1
        except Exception:
            logger.exception(f"Error computing score for driver {driver.id}")

    await db.flush()
    return count


async def _compute_single_driver(
    db: AsyncSession, driver: Driver, today: date
) -> AIScore | None:
    """Compute score for a single driver."""
    period_start = today - timedelta(days=30)

    # 1. Attendance score (30 days)
    attendance_result = await db.execute(
        select(
            func.count(AttendanceRecord.id).filter(
                AttendanceRecord.status.in_(["present", "late"])
            ).label("present"),
            func.count(AttendanceRecord.id).label("total"),
        ).where(
            AttendanceRecord.driver_id == driver.id,
            AttendanceRecord.date >= period_start,
        )
    )
    att_row = attendance_result.one()
    present_count = att_row[0] or 0
    total_attendance = att_row[1] or 0
    attendance_score = round(present_count / max(total_attendance, 1) * 100, 2)

    # 2. Punctuality score (late ratio inverted)
    late_result = await db.execute(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.driver_id == driver.id,
            AttendanceRecord.date >= period_start,
            AttendanceRecord.status == "late",
        )
    )
    late_count = late_result.scalar() or 0
    if present_count > 0:
        punctuality_score = round((1 - late_count / present_count) * 100, 2)
    else:
        punctuality_score = 50.0  # neutral if no data

    # 3. Performance/Orders score
    order_result = await db.execute(
        select(func.count(CapturedOrder.id)).where(
            CapturedOrder.driver_id == driver.id,
            CapturedOrder.captured_at >= datetime.combine(period_start, datetime.min.time()).replace(tzinfo=KWT),
        )
    )
    order_count = order_result.scalar() or 0
    # Benchmark: 5 orders/day for 30 days = 150
    performance_score = min(round(order_count / 150 * 100, 2), 100)

    # 4. Maintenance score (vehicle condition compliance)
    maintenance_score = 80.0  # Default good
    if driver.current_vehicle_id:
        overdue = await db.execute(
            select(func.count(MaintenanceRecord.id)).where(
                MaintenanceRecord.vehicle_id == driver.current_vehicle_id,
                MaintenanceRecord.category == "scheduled",
                MaintenanceRecord.status == "pending",
            )
        )
        overdue_count = overdue.scalar() or 0
        if overdue_count > 0:
            maintenance_score = max(80 - overdue_count * 20, 0)

    # Weighted composite
    composite = (
        attendance_score * 0.30
        + punctuality_score * 0.20
        + performance_score * 0.25
        + 70.0 * 0.15  # Active hours placeholder (no precise tracking yet)
        + maintenance_score * 0.10
    )

    # Adjustments
    breakdown = {
        "attendance_weight": 0.30,
        "punctuality_weight": 0.20,
        "performance_weight": 0.25,
        "active_hours_weight": 0.15,
        "maintenance_weight": 0.10,
        "orders_30d": order_count,
        "present_days": present_count,
        "late_days": late_count,
        "total_attendance_days": total_attendance,
    }

    # Streak bonus
    streak = await _get_attendance_streak(db, driver.id, today)
    if streak >= 7:
        composite += 5
        breakdown["streak_bonus"] = 5
        breakdown["streak_days"] = streak

    # Trend
    prev_score = await db.execute(
        select(AIScore.composite_score)
        .where(AIScore.driver_id == driver.id)
        .order_by(AIScore.date.desc())
        .limit(1)
    )
    prev = prev_score.scalar_one_or_none()
    trend = "stable"
    if prev is not None:
        diff = composite - float(prev)
        if diff > 5:
            trend = "improving"
            composite += 3
            breakdown["trend_bonus"] = 3
        elif diff < -5:
            trend = "declining"
            composite -= 3
            breakdown["trend_penalty"] = -3

    # Anomaly penalty
    active_critical = (await db.execute(
        select(func.count(Alert.id)).where(
            Alert.driver_id == driver.id,
            Alert.status == "active",
            Alert.severity == "critical",
        )
    )).scalar() or 0
    if active_critical > 0:
        composite -= 10
        breakdown["anomaly_penalty"] = -10

    composite = max(0, min(100, round(composite, 2)))

    return AIScore(
        tenant_id=driver.tenant_id,
        driver_id=driver.id,
        date=today,
        composite_score=Decimal(str(composite)),
        attendance_score=Decimal(str(min(attendance_score, 100))),
        punctuality_score=Decimal(str(min(max(punctuality_score, 0), 100))),
        performance_score=Decimal(str(performance_score)),
        maintenance_score=Decimal(str(maintenance_score)),
        score_breakdown=breakdown,
        trend=trend,
    )


async def _get_attendance_streak(db: AsyncSession, driver_id: uuid.UUID, today: date) -> int:
    """Count consecutive present days ending today."""
    result = await db.execute(
        select(AttendanceRecord.date, AttendanceRecord.status)
        .where(
            AttendanceRecord.driver_id == driver_id,
            AttendanceRecord.date <= today,
        )
        .order_by(AttendanceRecord.date.desc())
        .limit(30)
    )
    streak = 0
    for row in result.all():
        if row[1] in ("present", "late"):
            streak += 1
        else:
            break
    return streak
