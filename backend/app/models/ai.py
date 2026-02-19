import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date, DateTime, ForeignKey, Index, Numeric, String, Text,
    UniqueConstraint, text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin


class AIScore(Base, TenantMixin):
    __tablename__ = "ai_scores"
    __table_args__ = (
        UniqueConstraint("tenant_id", "driver_id", "date", name="uq_scores_tenant_driver_date"),
        Index("idx_scores_driver", "driver_id", "date"),
        Index("idx_scores_tenant_date", "tenant_id", "date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    composite_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    attendance_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    punctuality_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    performance_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    maintenance_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    score_breakdown: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    trend: Mapped[str | None] = mapped_column(String(10))
    # improving, stable, declining
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )


class Alert(Base, TenantMixin):
    __tablename__ = "alerts"
    __table_args__ = (
        Index("idx_alerts_tenant_status", "tenant_id", "status", "created_at"),
        Index("idx_alerts_driver", "driver_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    # attendance_anomaly, performance_drop, maintenance_due, no_orders, score_decline
    severity: Mapped[str] = mapped_column(String(10), nullable=False)
    # low, medium, high, critical
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    title_ar: Mapped[str | None] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text, nullable=False)
    message_ar: Mapped[str | None] = mapped_column(Text)
    driver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id")
    )
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id")
    )
    data: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    status: Mapped[str] = mapped_column(String(20), server_default="active")
    # active, acknowledged, dismissed, resolved
    acknowledged_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )


class AIDigest(Base, TenantMixin):
    __tablename__ = "ai_digests"
    __table_args__ = (
        UniqueConstraint("tenant_id", "date", name="uq_digests_tenant_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    content_ar: Mapped[dict | None] = mapped_column(JSONB)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )


class AIChatHistory(Base, TenantMixin):
    __tablename__ = "ai_chat_history"
    __table_args__ = (
        Index("idx_chat_tenant_user", "tenant_id", "user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    # web, api
    role: Mapped[str] = mapped_column(String(10), nullable=False)
    # user, assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tool_calls: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )
