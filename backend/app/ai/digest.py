"""Daily AI digest generation.

Gathers yesterday's stats and sends to Claude for a structured summary.
Falls back to template-based digest in mock mode.
"""

import logging
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai import AIDigest, Alert
from app.models.attendance import AttendanceRecord
from app.models.cash import CashRecord
from app.models.order import CapturedOrder
from app.models.driver import Driver
from app.models.vehicle import MaintenanceRecord

logger = logging.getLogger(__name__)

KWT = timezone(timedelta(hours=3))


def _today() -> date:
    return datetime.now(KWT).date()


async def generate_daily_digest(db: AsyncSession, tenant_id: uuid.UUID) -> dict:
    """Generate a daily digest for the given tenant. Returns the digest dict."""
    yesterday = _today() - timedelta(days=1)

    stats = await _gather_stats(db, yesterday)

    # Try Claude for rich digest, fall back to template
    from app.ai.claude_client import call_chat

    prompt = f"""Generate a daily fleet operations digest for {yesterday.isoformat()}.

Stats:
- Total active drivers: {stats['active_drivers']}
- Attendance: {stats['present']} present, {stats['late']} late, {stats['absent']} absent (rate: {stats['attendance_rate']}%)
- Orders: {stats['total_orders']} total, by platform: {stats['orders_by_platform']}
- Top driver: {stats['top_driver']} with {stats['top_driver_orders']} orders
- Cash collected: KWD {stats['cash_collected']}, deposited: KWD {stats['cash_deposited']}, outstanding: KWD {stats['cash_outstanding']}
- Maintenance: {stats['maintenance_count']} records, cost: KWD {stats['maintenance_cost']}
- Active alerts: {stats['active_alerts']}

Respond with a JSON object containing:
{{
  "summary": "Brief 2-3 sentence overview in Gulf Arabic",
  "summary_en": "Same in English",
  "highlights": ["list of 3-5 key highlights in Arabic"],
  "highlights_en": ["same in English"],
  "concerns": ["list of 0-3 concerns or issues in Arabic"],
  "concerns_en": ["same in English"],
  "recommendations": ["list of 1-3 actionable recommendations in Arabic"],
  "recommendations_en": ["same in English"],
  "metrics": {{
    "attendance_rate": {stats['attendance_rate']},
    "total_orders": {stats['total_orders']},
    "active_drivers": {stats['active_drivers']},
    "cash_outstanding": {stats['cash_outstanding']}
  }}
}}

Return ONLY the JSON, no markdown.
"""

    result = await call_chat([{"role": "user", "content": prompt}])

    # Parse Claude's response
    content = result["content"]
    content_parsed = _parse_digest_content(content, stats)

    # Build Arabic content
    content_ar = {
        "summary": content_parsed.get("summary", ""),
        "highlights": content_parsed.get("highlights", []),
        "concerns": content_parsed.get("concerns", []),
        "recommendations": content_parsed.get("recommendations", []),
        "metrics": content_parsed.get("metrics", stats),
    }

    # Build English content
    content_en = {
        "summary": content_parsed.get("summary_en", content_parsed.get("summary", "")),
        "highlights": content_parsed.get("highlights_en", content_parsed.get("highlights", [])),
        "concerns": content_parsed.get("concerns_en", content_parsed.get("concerns", [])),
        "recommendations": content_parsed.get("recommendations_en", content_parsed.get("recommendations", [])),
        "metrics": content_parsed.get("metrics", stats),
    }

    # Upsert digest
    existing = await db.execute(
        select(AIDigest).where(
            AIDigest.tenant_id == tenant_id,
            AIDigest.date == yesterday,
        )
    )
    digest = existing.scalar_one_or_none()

    if digest:
        digest.content = content_en
        digest.content_ar = content_ar
        digest.generated_at = datetime.now(KWT)
    else:
        digest = AIDigest(
            tenant_id=tenant_id,
            date=yesterday,
            content=content_en,
            content_ar=content_ar,
        )
        db.add(digest)

    await db.flush()

    return {
        "date": yesterday.isoformat(),
        "content": content_en,
        "content_ar": content_ar,
    }


def _parse_digest_content(content: str, stats: dict) -> dict:
    """Try to parse Claude's JSON response, fall back to template."""
    import json

    # Try to extract JSON from response
    try:
        # Handle possible markdown code blocks
        if "```" in content:
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                content = content[start:end]
        return json.loads(content)
    except (json.JSONDecodeError, ValueError):
        pass

    # Fallback template
    return {
        "summary": f"يوم أمس كان فيه {stats['total_orders']} طلب توصيل مع نسبة حضور {stats['attendance_rate']}%.",
        "summary_en": f"Yesterday saw {stats['total_orders']} delivery orders with {stats['attendance_rate']}% attendance.",
        "highlights": [
            f"تم تسجيل {stats['total_orders']} طلب توصيل",
            f"نسبة الحضور {stats['attendance_rate']}%",
            f"{stats['active_drivers']} سائق نشط",
        ],
        "highlights_en": [
            f"{stats['total_orders']} delivery orders recorded",
            f"Attendance rate at {stats['attendance_rate']}%",
            f"{stats['active_drivers']} active drivers",
        ],
        "concerns": [],
        "concerns_en": [],
        "recommendations": [],
        "recommendations_en": [],
        "metrics": {
            "attendance_rate": stats["attendance_rate"],
            "total_orders": stats["total_orders"],
            "active_drivers": stats["active_drivers"],
            "cash_outstanding": stats["cash_outstanding"],
        },
    }


async def _gather_stats(db: AsyncSession, target_date: date) -> dict:
    """Gather all stats for a given date."""
    # Active drivers
    active_drivers = (await db.execute(
        select(func.count(Driver.id)).where(Driver.status == "active")
    )).scalar() or 0

    # Attendance
    att_result = await db.execute(
        select(AttendanceRecord.status, func.count(AttendanceRecord.id))
        .where(AttendanceRecord.date == target_date)
        .group_by(AttendanceRecord.status)
    )
    att_counts = dict(att_result.all())
    present = att_counts.get("present", 0)
    late = att_counts.get("late", 0)
    absent = att_counts.get("absent", 0)
    total_att = present + late + absent
    attendance_rate = round((present + late) / max(total_att, 1) * 100, 1)

    # Orders
    total_orders = (await db.execute(
        select(func.count(CapturedOrder.id)).where(
            func.date(CapturedOrder.captured_at) == target_date
        )
    )).scalar() or 0

    platform_result = await db.execute(
        select(CapturedOrder.platform, func.count(CapturedOrder.id))
        .where(func.date(CapturedOrder.captured_at) == target_date)
        .group_by(CapturedOrder.platform)
    )
    orders_by_platform = dict(platform_result.all())

    # Top driver
    top_result = await db.execute(
        select(Driver.name_ar, func.count(CapturedOrder.id).label("cnt"))
        .join(Driver, CapturedOrder.driver_id == Driver.id)
        .where(func.date(CapturedOrder.captured_at) == target_date)
        .group_by(Driver.id, Driver.name_ar)
        .order_by(func.count(CapturedOrder.id).desc())
        .limit(1)
    )
    top = top_result.first()
    top_driver = top[0] if top else "N/A"
    top_driver_orders = top[1] if top else 0

    # Cash
    cash_collected = (await db.execute(
        select(func.sum(CashRecord.amount)).where(
            CashRecord.record_type == "collection",
            CashRecord.date == target_date,
        )
    )).scalar()
    cash_deposited = (await db.execute(
        select(func.sum(CashRecord.amount)).where(
            CashRecord.record_type == "deposit",
            CashRecord.date == target_date,
        )
    )).scalar()
    cash_collected = round(float(cash_collected), 3) if cash_collected else 0
    cash_deposited = round(float(cash_deposited), 3) if cash_deposited else 0

    # Maintenance
    maint_result = await db.execute(
        select(func.count(MaintenanceRecord.id), func.sum(MaintenanceRecord.cost))
        .where(func.date(MaintenanceRecord.created_at) == target_date)
    )
    maint_row = maint_result.one()
    maintenance_count = maint_row[0] or 0
    maintenance_cost = round(float(maint_row[1]), 3) if maint_row[1] else 0

    # Active alerts
    active_alerts = (await db.execute(
        select(func.count(Alert.id)).where(Alert.status == "active")
    )).scalar() or 0

    return {
        "active_drivers": active_drivers,
        "present": present,
        "late": late,
        "absent": absent,
        "attendance_rate": attendance_rate,
        "total_orders": total_orders,
        "orders_by_platform": orders_by_platform,
        "top_driver": top_driver,
        "top_driver_orders": top_driver_orders,
        "cash_collected": cash_collected,
        "cash_deposited": cash_deposited,
        "cash_outstanding": round(cash_collected - cash_deposited, 3),
        "maintenance_count": maintenance_count,
        "maintenance_cost": maintenance_cost,
        "active_alerts": active_alerts,
    }
