"""Execute AI tool calls against the database."""

import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select, case, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai import AIScore, Alert
from app.models.attendance import AttendanceRecord
from app.models.cash import CashRecord
from app.models.device import Device
from app.models.driver import Driver
from app.models.order import CapturedOrder
from app.models.shift import Shift
from app.models.ticket import Ticket
from app.models.vehicle import Vehicle, MaintenanceRecord

logger = logging.getLogger(__name__)

# Kuwait timezone offset
KWT = timezone(timedelta(hours=3))


def _today() -> date:
    return datetime.now(KWT).date()


def _serialize(val):
    """Make a value JSON-safe."""
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if hasattr(val, "__dict__"):
        return str(val)
    return val


async def execute_tool(name: str, input_data: dict, db: AsyncSession) -> dict:
    """Execute a tool by name and return the result dict."""
    executor_map = {
        "get_fleet_overview": _fleet_overview,
        "get_driver_info": _driver_info,
        "get_driver_list": _driver_list,
        "get_attendance_summary": _attendance_summary,
        "get_order_summary": _order_summary,
        "get_vehicle_status": _vehicle_status,
        "get_maintenance_summary": _maintenance_summary,
        "get_cash_summary": _cash_summary,
        "get_ticket_summary": _ticket_summary,
        "get_active_alerts": _active_alerts,
        "get_driver_scores": _driver_scores,
        "get_device_status": _device_status,
    }
    fn = executor_map.get(name)
    if not fn:
        return {"error": f"Unknown tool: {name}"}
    try:
        return await fn(db, input_data)
    except Exception as e:
        logger.exception(f"Tool execution error: {name}")
        return {"error": str(e)}


async def _fleet_overview(db: AsyncSession, _input: dict) -> dict:
    today = _today()

    total_drivers = (await db.execute(select(func.count(Driver.id)))).scalar() or 0
    active_drivers = (await db.execute(
        select(func.count(Driver.id)).where(Driver.status == "active")
    )).scalar() or 0

    total_vehicles = (await db.execute(select(func.count(Vehicle.id)))).scalar() or 0
    active_vehicles = (await db.execute(
        select(func.count(Vehicle.id)).where(Vehicle.status == "active")
    )).scalar() or 0

    orders_today = (await db.execute(
        select(func.count(CapturedOrder.id)).where(
            func.date(CapturedOrder.captured_at) == today
        )
    )).scalar() or 0

    attendance_present = (await db.execute(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.date == today,
            AttendanceRecord.status.in_(["present", "late"]),
        )
    )).scalar() or 0

    open_tickets = (await db.execute(
        select(func.count(Ticket.id)).where(
            Ticket.status.in_(["open", "in_progress"])
        )
    )).scalar() or 0

    online_devices = (await db.execute(
        select(func.count(Device.id)).where(
            Device.status == "active",
            Device.last_heartbeat_at > datetime.now(KWT) - timedelta(minutes=30),
        )
    )).scalar() or 0
    total_devices = (await db.execute(select(func.count(Device.id)))).scalar() or 0

    return {
        "date": today.isoformat(),
        "drivers": {"total": total_drivers, "active": active_drivers},
        "vehicles": {"total": total_vehicles, "active": active_vehicles},
        "orders_today": orders_today,
        "attendance": {"present": attendance_present, "total_active": active_drivers,
                       "rate": round(attendance_present / max(active_drivers, 1) * 100, 1)},
        "open_tickets": open_tickets,
        "devices": {"online": online_devices, "total": total_devices},
    }


async def _driver_info(db: AsyncSession, input_data: dict) -> dict:
    query = input_data.get("query", "")
    if not query:
        return {"error": "No query provided"}

    # Search by name, name_ar, or employee_id
    result = await db.execute(
        select(Driver).where(
            (Driver.name.ilike(f"%{query}%")) |
            (Driver.name_ar.ilike(f"%{query}%")) |
            (Driver.employee_id.ilike(f"%{query}%"))
        ).limit(1)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        return {"error": f"No driver found matching '{query}'"}

    today = _today()

    # Recent orders count
    orders_count = (await db.execute(
        select(func.count(CapturedOrder.id)).where(
            CapturedOrder.driver_id == driver.id,
            func.date(CapturedOrder.captured_at) == today,
        )
    )).scalar() or 0

    # Latest score
    score_result = await db.execute(
        select(AIScore).where(AIScore.driver_id == driver.id)
        .order_by(AIScore.date.desc()).limit(1)
    )
    score = score_result.scalar_one_or_none()

    return {
        "id": str(driver.id),
        "name": driver.name,
        "name_ar": driver.name_ar,
        "employee_id": driver.employee_id,
        "status": driver.status,
        "platform": driver.platform,
        "phone": driver.phone,
        "hire_date": driver.hire_date.isoformat() if driver.hire_date else None,
        "orders_today": orders_count,
        "score": {
            "composite": _serialize(score.composite_score) if score else None,
            "trend": score.trend if score else None,
            "date": score.date.isoformat() if score else None,
        },
    }


async def _driver_list(db: AsyncSession, input_data: dict) -> dict:
    q = select(Driver)
    if status := input_data.get("status"):
        q = q.where(Driver.status == status)
    if platform := input_data.get("platform"):
        q = q.where(Driver.platform == platform)
    limit = min(input_data.get("limit", 10), 50)
    q = q.limit(limit)

    result = await db.execute(q)
    drivers = result.scalars().all()

    return {
        "count": len(drivers),
        "drivers": [
            {
                "name": d.name,
                "name_ar": d.name_ar,
                "employee_id": d.employee_id,
                "status": d.status,
                "platform": d.platform,
            }
            for d in drivers
        ],
    }


async def _attendance_summary(db: AsyncSession, input_data: dict) -> dict:
    target_date = input_data.get("date")
    if target_date:
        from datetime import date as date_type
        target = date_type.fromisoformat(target_date)
    else:
        target = _today()

    result = await db.execute(
        select(
            AttendanceRecord.status,
            func.count(AttendanceRecord.id),
        ).where(AttendanceRecord.date == target)
        .group_by(AttendanceRecord.status)
    )
    counts = dict(result.all())

    present = counts.get("present", 0)
    late = counts.get("late", 0)
    absent = counts.get("absent", 0)
    excused = counts.get("excused", 0)
    total = present + late + absent + excused

    return {
        "date": target.isoformat(),
        "present": present,
        "late": late,
        "absent": absent,
        "excused": excused,
        "total": total,
        "attendance_rate": round((present + late) / max(total, 1) * 100, 1),
    }


async def _order_summary(db: AsyncSession, input_data: dict) -> dict:
    target_date = input_data.get("date")
    if target_date:
        from datetime import date as date_type
        target = date_type.fromisoformat(target_date)
    else:
        target = _today()

    # Total orders
    total = (await db.execute(
        select(func.count(CapturedOrder.id)).where(
            func.date(CapturedOrder.captured_at) == target
        )
    )).scalar() or 0

    # By platform
    platform_result = await db.execute(
        select(CapturedOrder.platform, func.count(CapturedOrder.id)).where(
            func.date(CapturedOrder.captured_at) == target
        ).group_by(CapturedOrder.platform)
    )
    by_platform = dict(platform_result.all())

    # Top drivers
    top_result = await db.execute(
        select(Driver.name_ar, Driver.name, func.count(CapturedOrder.id).label("cnt"))
        .join(Driver, CapturedOrder.driver_id == Driver.id)
        .where(func.date(CapturedOrder.captured_at) == target)
        .group_by(Driver.id, Driver.name_ar, Driver.name)
        .order_by(func.count(CapturedOrder.id).desc())
        .limit(5)
    )
    top_drivers = [
        {"name_ar": r[0], "name": r[1], "orders": r[2]}
        for r in top_result.all()
    ]

    return {
        "date": target.isoformat(),
        "total_orders": total,
        "by_platform": by_platform,
        "top_drivers": top_drivers,
    }


async def _vehicle_status(db: AsyncSession, _input: dict) -> dict:
    result = await db.execute(
        select(Vehicle.status, func.count(Vehicle.id)).group_by(Vehicle.status)
    )
    counts = dict(result.all())

    # Vehicles with upcoming/overdue maintenance
    overdue = await db.execute(
        select(Vehicle.plate_number, Vehicle.make, Vehicle.model).where(
            Vehicle.status == "in_maintenance"
        ).limit(10)
    )
    in_maintenance = [
        {"plate": r[0], "make": r[1], "model": r[2]}
        for r in overdue.all()
    ]

    return {
        "active": counts.get("active", 0),
        "in_maintenance": counts.get("in_maintenance", 0),
        "decommissioned": counts.get("decommissioned", 0),
        "vehicles_in_maintenance": in_maintenance,
    }


async def _maintenance_summary(db: AsyncSession, input_data: dict) -> dict:
    days = input_data.get("days", 30)
    since = datetime.now(KWT) - timedelta(days=days)

    result = await db.execute(
        select(
            func.count(MaintenanceRecord.id),
            func.sum(MaintenanceRecord.cost),
        ).where(MaintenanceRecord.created_at >= since)
    )
    row = result.one()
    total_count = row[0] or 0
    total_cost = float(row[1]) if row[1] else 0.0

    # By category
    cat_result = await db.execute(
        select(MaintenanceRecord.category, func.count(MaintenanceRecord.id))
        .where(MaintenanceRecord.created_at >= since)
        .group_by(MaintenanceRecord.category)
    )
    by_category = dict(cat_result.all())

    return {
        "period_days": days,
        "total_records": total_count,
        "total_cost_kwd": round(total_cost, 3),
        "by_category": by_category,
    }


async def _cash_summary(db: AsyncSession, _input: dict) -> dict:
    collected = (await db.execute(
        select(func.sum(CashRecord.amount)).where(CashRecord.record_type == "collection")
    )).scalar()
    deposited = (await db.execute(
        select(func.sum(CashRecord.amount)).where(CashRecord.record_type == "deposit")
    )).scalar()

    collected_val = float(collected) if collected else 0.0
    deposited_val = float(deposited) if deposited else 0.0
    outstanding = collected_val - deposited_val

    # Drivers with outstanding cash
    outstanding_result = await db.execute(
        select(
            Driver.name_ar, Driver.name,
            (func.sum(case(
                (CashRecord.record_type == "collection", CashRecord.amount),
                else_=0,
            )) - func.sum(case(
                (CashRecord.record_type == "deposit", CashRecord.amount),
                else_=0,
            ))).label("balance"),
        )
        .join(Driver, CashRecord.driver_id == Driver.id)
        .group_by(Driver.id, Driver.name_ar, Driver.name)
        .having(
            func.sum(case(
                (CashRecord.record_type == "collection", CashRecord.amount),
                else_=0,
            )) - func.sum(case(
                (CashRecord.record_type == "deposit", CashRecord.amount),
                else_=0,
            )) > 0
        )
        .order_by(func.sum(case(
            (CashRecord.record_type == "collection", CashRecord.amount),
            else_=0,
        )).desc())
        .limit(10)
    )
    outstanding_drivers = [
        {"name_ar": r[0], "name": r[1], "balance_kwd": round(float(r[2]), 3)}
        for r in outstanding_result.all()
    ]

    return {
        "collected_kwd": round(collected_val, 3),
        "deposited_kwd": round(deposited_val, 3),
        "outstanding_kwd": round(outstanding, 3),
        "outstanding_drivers": outstanding_drivers,
    }


async def _ticket_summary(db: AsyncSession, _input: dict) -> dict:
    # By status
    status_result = await db.execute(
        select(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status)
    )
    by_status = dict(status_result.all())

    # By category
    cat_result = await db.execute(
        select(Ticket.category, func.count(Ticket.id)).group_by(Ticket.category)
    )
    by_category = dict(cat_result.all())

    # By priority
    prio_result = await db.execute(
        select(Ticket.priority, func.count(Ticket.id)).group_by(Ticket.priority)
    )
    by_priority = dict(prio_result.all())

    return {
        "by_status": by_status,
        "by_category": by_category,
        "by_priority": by_priority,
    }


async def _active_alerts(db: AsyncSession, input_data: dict) -> dict:
    q = select(Alert).where(Alert.status == "active").order_by(Alert.created_at.desc())
    if severity := input_data.get("severity"):
        q = q.where(Alert.severity == severity)
    q = q.limit(20)

    result = await db.execute(q)
    alerts = result.scalars().all()

    return {
        "count": len(alerts),
        "alerts": [
            {
                "type": a.type,
                "severity": a.severity,
                "title_ar": a.title_ar or a.title,
                "title": a.title,
                "message": a.message,
                "created_at": a.created_at.isoformat(),
            }
            for a in alerts
        ],
    }


async def _driver_scores(db: AsyncSession, input_data: dict) -> dict:
    driver_name = input_data.get("driver_name")
    sort_order = input_data.get("sort", "highest")
    limit = min(input_data.get("limit", 10), 50)

    if driver_name:
        # Get specific driver's latest score
        result = await db.execute(
            select(AIScore, Driver.name, Driver.name_ar)
            .join(Driver, AIScore.driver_id == Driver.id)
            .where(
                (Driver.name.ilike(f"%{driver_name}%")) |
                (Driver.name_ar.ilike(f"%{driver_name}%"))
            )
            .order_by(AIScore.date.desc())
            .limit(5)
        )
        rows = result.all()
        if not rows:
            return {"error": f"No scores found for '{driver_name}'"}
        return {
            "driver": rows[0][1],
            "driver_ar": rows[0][2],
            "scores": [
                {
                    "date": _serialize(r[0].date),
                    "composite": _serialize(r[0].composite_score),
                    "attendance": _serialize(r[0].attendance_score),
                    "punctuality": _serialize(r[0].punctuality_score),
                    "performance": _serialize(r[0].performance_score),
                    "maintenance": _serialize(r[0].maintenance_score),
                    "trend": r[0].trend,
                }
                for r in rows
            ],
        }

    # Get latest scores for all drivers
    from sqlalchemy import distinct
    subq = (
        select(
            AIScore.driver_id,
            func.max(AIScore.date).label("max_date"),
        )
        .group_by(AIScore.driver_id)
        .subquery()
    )
    order = AIScore.composite_score.desc() if sort_order == "highest" else AIScore.composite_score.asc()
    result = await db.execute(
        select(AIScore, Driver.name, Driver.name_ar)
        .join(subq, and_(
            AIScore.driver_id == subq.c.driver_id,
            AIScore.date == subq.c.max_date,
        ))
        .join(Driver, AIScore.driver_id == Driver.id)
        .order_by(order)
        .limit(limit)
    )
    rows = result.all()

    return {
        "count": len(rows),
        "sort": sort_order,
        "scores": [
            {
                "driver": r[1],
                "driver_ar": r[2],
                "composite": _serialize(r[0].composite_score),
                "trend": r[0].trend,
                "date": _serialize(r[0].date),
            }
            for r in rows
        ],
    }


async def _device_status(db: AsyncSession, _input: dict) -> dict:
    thirty_min_ago = datetime.now(KWT) - timedelta(minutes=30)

    total = (await db.execute(select(func.count(Device.id)))).scalar() or 0
    active = (await db.execute(
        select(func.count(Device.id)).where(Device.status == "active")
    )).scalar() or 0
    online = (await db.execute(
        select(func.count(Device.id)).where(
            Device.status == "active",
            Device.last_heartbeat_at > thirty_min_ago,
        )
    )).scalar() or 0

    # Low battery devices
    low_battery = await db.execute(
        select(Device.device_model, Device.battery_level, Device.phone_number)
        .where(Device.battery_level < 20, Device.status == "active")
        .limit(10)
    )
    low_batt_list = [
        {"model": r[0], "battery": r[1], "phone": r[2]}
        for r in low_battery.all()
    ]

    return {
        "total": total,
        "active": active,
        "online": online,
        "offline": active - online,
        "low_battery_devices": low_batt_list,
    }
