import uuid
from datetime import datetime

from sqlalchemy import Boolean, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name_ar: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str] = mapped_column(String(3), server_default="KWT")
    timezone: Mapped[str] = mapped_column(String(50), server_default="Asia/Kuwait")
    currency: Mapped[str] = mapped_column(String(3), server_default="KWD")
    subscription_plan: Mapped[str] = mapped_column(String(20), server_default="starter")
    max_drivers: Mapped[int] = mapped_column(Integer, server_default="100")
    settings: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
