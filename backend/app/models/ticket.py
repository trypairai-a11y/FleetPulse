import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin


class Ticket(Base, TenantMixin, TimestampMixin):
    __tablename__ = "tickets"
    __table_args__ = (
        Index("idx_tickets_tenant_status", "tenant_id", "status"),
        Index("idx_tickets_driver", "driver_id"),
        Index("idx_tickets_category", "tenant_id", "category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    title_ar: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    # maintenance, accident, complaint, dirty_vehicle, general
    priority: Mapped[str] = mapped_column(String(10), server_default="medium")
    # low, medium, high, urgent
    status: Mapped[str] = mapped_column(String(20), server_default="open")
    # open, in_progress, awaiting_approval, resolved, closed, rejected
    driver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id")
    )
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id")
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    data: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    # Ticket-type-specific data (photos, amounts, etc.)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TicketComment(Base, TenantMixin):
    __tablename__ = "ticket_comments"
    __table_args__ = (
        Index("idx_ticket_comments_ticket", "ticket_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    attachments: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )
