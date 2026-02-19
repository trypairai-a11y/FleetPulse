import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    name_ar: str | None = None
    role: str = "viewer"
    phone: str | None = None
    language: str = "en"


class UserUpdate(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    role: str | None = None
    phone: str | None = None
    language: str | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    name: str
    name_ar: str | None
    role: str
    phone: str | None
    language: str
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
