"""APScheduler setup for background jobs.

Jobs:
  - score_computation: daily at 2:00 AM KWT
  - anomaly_scan: every hour
  - daily_digest: daily at 6:00 AM KWT
"""

import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select, text

from app.database import async_session_factory
from app.models.tenant import Tenant

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def setup_scheduler():
    """Configure all scheduled jobs."""
    scheduler.add_job(
        _run_score_computation,
        CronTrigger(hour=2, minute=0, timezone="Asia/Kuwait"),
        id="score_computation",
        name="Daily driver score computation",
        replace_existing=True,
    )

    scheduler.add_job(
        _run_anomaly_scan,
        IntervalTrigger(hours=1),
        id="anomaly_scan",
        name="Hourly anomaly detection scan",
        replace_existing=True,
    )

    scheduler.add_job(
        _run_daily_digest,
        CronTrigger(hour=6, minute=0, timezone="Asia/Kuwait"),
        id="daily_digest",
        name="Daily AI digest generation",
        replace_existing=True,
    )

    logger.info("Scheduler configured with 3 jobs")


async def _get_tenant_ids() -> list:
    """Get all active tenant IDs."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(Tenant.id).where(Tenant.is_active == True)
        )
        return [r[0] for r in result.all()]


async def _run_score_computation():
    """Compute driver scores for all tenants."""
    from app.ai.scoring import compute_all_driver_scores

    logger.info("Starting scheduled score computation")
    tenant_ids = await _get_tenant_ids()

    for tenant_id in tenant_ids:
        try:
            async with async_session_factory() as session:
                async with session.begin():
                    await session.execute(
                        text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
                    )
                    count = await compute_all_driver_scores(session, tenant_id)
                    logger.info(f"Computed {count} scores for tenant {tenant_id}")
        except Exception:
            logger.exception(f"Score computation failed for tenant {tenant_id}")


async def _run_anomaly_scan():
    """Run anomaly detection for all tenants."""
    from app.ai.anomaly import run_anomaly_scan

    logger.info("Starting scheduled anomaly scan")
    tenant_ids = await _get_tenant_ids()

    for tenant_id in tenant_ids:
        try:
            async with async_session_factory() as session:
                async with session.begin():
                    await session.execute(
                        text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
                    )
                    count = await run_anomaly_scan(session, tenant_id)
                    if count > 0:
                        logger.info(f"Created {count} alerts for tenant {tenant_id}")
        except Exception:
            logger.exception(f"Anomaly scan failed for tenant {tenant_id}")


async def _run_daily_digest():
    """Generate daily digest for all tenants."""
    from app.ai.digest import generate_daily_digest

    logger.info("Starting scheduled daily digest")
    tenant_ids = await _get_tenant_ids()

    for tenant_id in tenant_ids:
        try:
            async with async_session_factory() as session:
                async with session.begin():
                    await session.execute(
                        text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
                    )
                    await generate_daily_digest(session, tenant_id)
                    logger.info(f"Generated digest for tenant {tenant_id}")
        except Exception:
            logger.exception(f"Digest generation failed for tenant {tenant_id}")
