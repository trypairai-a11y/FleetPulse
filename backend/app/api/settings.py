"""Settings endpoints: company profile, user management, alert thresholds."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_role
from app.models.tenant import Tenant
from app.models.user import User
from app.services.auth_service import hash_password

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ── Company Profile ──

@router.get("")
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")

    return {
        "tenant_id": str(tenant.id),
        "name": tenant.name,
        "name_ar": tenant.name_ar,
        "slug": tenant.slug,
        "country": tenant.country,
        "timezone": tenant.timezone,
        "currency": tenant.currency,
        "subscription_plan": tenant.subscription_plan,
        "max_drivers": tenant.max_drivers,
        "settings": tenant.settings,
    }


@router.put("")
async def update_settings(
    body: dict,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")

    if "name" in body:
        tenant.name = body["name"]
    if "name_ar" in body:
        tenant.name_ar = body["name_ar"]
    if "settings" in body:
        tenant.settings = {**(tenant.settings or {}), **body["settings"]}

    return {"message": "Settings updated"}


# ── User Management ──

class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    name_ar: str = ""
    role: str = "viewer"
    phone: str = ""


class UserUpdateRequest(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    role: str | None = None
    phone: str | None = None
    is_active: bool | None = None
    password: str | None = None


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(select(func.count(User.id)))).scalar() or 0
    result = await db.execute(
        select(User)
        .order_by(User.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    users = result.scalars().all()
    return {
        "items": [
            {
                "id": str(u.id),
                "email": u.email,
                "name": u.name,
                "name_ar": u.name_ar,
                "role": u.role,
                "phone": u.phone,
                "is_active": u.is_active,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.post("/users")
async def create_user(
    body: UserCreateRequest,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    # Check duplicate email
    existing = await db.execute(
        select(User).where(User.email == body.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "User with this email already exists")

    user = User(
        tenant_id=current_user.tenant_id,
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        name_ar=body.name_ar,
        role=body.role,
        phone=body.phone,
    )
    db.add(user)
    await db.flush()
    return {"id": str(user.id), "message": "User created"}


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    body: UserUpdateRequest,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    if body.name is not None:
        user.name = body.name
    if body.name_ar is not None:
        user.name_ar = body.name_ar
    if body.role is not None:
        user.role = body.role
    if body.phone is not None:
        user.phone = body.phone
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password is not None:
        user.password_hash = hash_password(body.password)

    await db.flush()
    return {"message": "User updated"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    if str(current_user.id) == user_id:
        raise HTTPException(400, "Cannot delete your own account")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    user.is_active = False  # Soft delete
    await db.flush()
    return {"message": "User deactivated"}


# ── Alert Thresholds ──

@router.get("/alerts-config")
async def get_alert_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Tenant not found")

    settings_data = tenant.settings or {}
    return {
        "alert_thresholds": settings_data.get("alert_thresholds", {
            "absence_days_threshold": 3,
            "score_drop_threshold": 15,
            "cash_overdue_days": 3,
            "device_offline_hours": 2,
            "low_orders_pct": 50,
        })
    }


@router.put("/alerts-config")
async def update_alert_config(
    body: dict,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Tenant not found")

    settings_data = tenant.settings or {}
    settings_data["alert_thresholds"] = body
    tenant.settings = settings_data
    await db.flush()
    return {"message": "Alert thresholds updated"}
