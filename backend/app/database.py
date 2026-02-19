from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import text
from app.config import settings
import uuid

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_tenant_session(tenant_id: uuid.UUID) -> AsyncSession:
    """Create a session with tenant context set via SET LOCAL.

    CRITICAL: Uses SET LOCAL (not SET) so the variable is scoped to the
    transaction only. This prevents tenant ID from leaking across pooled
    connections.
    """
    session = async_session_factory()
    await session.execute(
        text("SET LOCAL app.current_tenant_id = :tid"),
        {"tid": str(tenant_id)},
    )
    return session


async def get_plain_session() -> AsyncSession:
    """Create a session without tenant context (for login/refresh)."""
    return async_session_factory()
