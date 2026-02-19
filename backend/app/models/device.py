import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin


class Device(Base, TenantMixin, TimestampMixin):
    __tablename__ = "devices"
    __table_args__ = (
        Index("idx_devices_tenant_status", "tenant_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    device_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    device_model: Mapped[str | None] = mapped_column(String(100))
    os_version: Mapped[str | None] = mapped_column(String(50))
    app_version: Mapped[str | None] = mapped_column(String(50))
    phone_number: Mapped[str | None] = mapped_column(String(20))
    imei: Mapped[str | None] = mapped_column(String(50))
    assigned_driver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", use_alter=True)
    )
    status: Mapped[str] = mapped_column(String(20), server_default="active")
    # active, inactive, lost, decommissioned
    battery_level: Mapped[int | None] = mapped_column(Integer)
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_location_lat: Mapped[float | None] = mapped_column()
    last_location_lng: Mapped[float | None] = mapped_column()
    config: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    # Agent config: parser rules, sync intervals, etc.


class DeviceCommand(Base, TenantMixin):
    __tablename__ = "device_commands"
    __table_args__ = (
        Index("idx_device_commands_device_status", "device_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False
    )
    command_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # lock, wipe, locate, update_config, install_app, reboot, ring
    payload: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    status: Mapped[str] = mapped_column(String(20), server_default="pending")
    # pending, sent, completed, failed
    result: Mapped[dict | None] = mapped_column(JSONB)
    issued_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
