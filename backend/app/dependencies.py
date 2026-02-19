import uuid
from typing import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.user import User
from app.models.device import Device
from app.services.auth_service import decode_token

security = HTTPBearer(auto_error=False)


async def get_db(request: Request):
    """DB session with tenant context from authenticated user."""
    async with async_session_factory() as session:
        async with session.begin():
            tenant_id = getattr(request.state, "tenant_id", None)
            if tenant_id:
                await session.execute(
                    text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
                )
            yield session


async def get_db_no_tenant():
    """DB session without tenant context (for login/refresh)."""
    async with async_session_factory() as session:
        async with session.begin():
            yield session


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token payload")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")

    return user


def require_role(*roles: str) -> Callable:
    """Dependency that checks user role."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Role '{current_user.role}' not authorized. Required: {', '.join(roles)}",
            )
        return current_user
    return role_checker


async def get_current_device(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Device:
    """Authenticate requests from the Android agent using device tokens."""
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "device":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid device token")

    device_id = payload.get("sub")
    if not device_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid device token payload")

    result = await db.execute(select(Device).where(Device.id == uuid.UUID(device_id)))
    device = result.scalar_one_or_none()

    if device is None or device.status != "active":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Device not found or inactive")

    return device
