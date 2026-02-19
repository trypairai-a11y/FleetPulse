import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime, ForeignKey, Index, Integer, Numeric,
    String, Text, text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin


class CapturedOrder(Base, TenantMixin):
    """Orders captured from phone notifications by the Android agent."""
    __tablename__ = "captured_orders"
    __table_args__ = (
        Index("idx_captured_orders_tenant_captured", "tenant_id", "captured_at"),
        Index("idx_captured_orders_driver", "driver_id", "captured_at"),
        Index("idx_captured_orders_platform", "tenant_id", "platform"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False
    )
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id")
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    # talabat, keeta, deliveroo, jahez
    order_ref: Mapped[str | None] = mapped_column(String(100))
    # External order reference from notification
    status: Mapped[str] = mapped_column(String(30), server_default="captured")
    # captured, assigned, picked_up, delivered, cancelled
    raw_notification: Mapped[dict | None] = mapped_column(JSONB)
    # Raw notification data for debugging/reprocessing
    parsed_data: Mapped[dict | None] = mapped_column(JSONB)
    # { customer_area: "...", restaurant: "...", amount: 1.5 }
    amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )
