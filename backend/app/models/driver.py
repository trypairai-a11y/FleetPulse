import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin


class Driver(Base, TenantMixin, TimestampMixin):
    __tablename__ = "drivers"
    __table_args__ = (
        UniqueConstraint("tenant_id", "phone", name="uq_drivers_tenant_phone"),
        Index("idx_drivers_tenant_status", "tenant_id", "status"),
        Index("idx_drivers_phone", "phone"),
        Index("idx_drivers_tenant_platform", "tenant_id", "platform"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    employee_id: Mapped[str | None] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_ar: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), server_default="active")
    # active, inactive, on_leave, suspended, terminated
    hire_date: Mapped[date | None] = mapped_column(Date)
    nationality: Mapped[str | None] = mapped_column(String(100))
    license_number: Mapped[str | None] = mapped_column(String(100))
    license_expiry: Mapped[date | None] = mapped_column(Date)
    license_group: Mapped[str | None] = mapped_column(String(50))
    # Single platform per driver
    platform: Mapped[str | None] = mapped_column(String(50))
    # talabat, keeta, deliveroo, jahez
    current_vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id", use_alter=True)
    )
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", use_alter=True)
    )
    notes: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
