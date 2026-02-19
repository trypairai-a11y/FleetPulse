import uuid
from datetime import date, datetime, time

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Index, Integer,
    Numeric, String, Text, Time, UniqueConstraint, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin


class ShiftTemplate(Base, TenantMixin):
    __tablename__ = "shift_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    name_ar: Mapped[str | None] = mapped_column(String(100))
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )


class Shift(Base, TenantMixin, TimestampMixin):
    __tablename__ = "shifts"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "driver_id", "date", "scheduled_start",
            name="uq_shifts_tenant_driver_date_start",
        ),
        Index("idx_shifts_tenant_date", "tenant_id", "date"),
        Index("idx_shifts_driver_date", "driver_id", "date"),
        Index("idx_shifts_status", "tenant_id", "status", "date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shift_templates.id")
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    scheduled_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scheduled_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actual_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    actual_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), server_default="scheduled")
    # scheduled, active, completed, missed, cancelled
    clock_in_method: Mapped[str | None] = mapped_column(String(20))
    # agent, manual, api
    clock_out_method: Mapped[str | None] = mapped_column(String(20))
    clock_in_selfie_url: Mapped[str | None] = mapped_column(String(500))
    clock_in_location_lat: Mapped[float | None] = mapped_column(Float)
    clock_in_location_lng: Mapped[float | None] = mapped_column(Float)
    clock_out_location_lat: Mapped[float | None] = mapped_column(Float)
    clock_out_location_lng: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)
