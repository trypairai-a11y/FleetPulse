import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, Date, DateTime, Numeric, ForeignKey, Index, Integer,
    String, Text, UniqueConstraint, text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin


class Vehicle(Base, TenantMixin, TimestampMixin):
    __tablename__ = "vehicles"
    __table_args__ = (
        UniqueConstraint("tenant_id", "plate_number", name="uq_vehicles_tenant_plate"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    plate_number: Mapped[str] = mapped_column(String(50), nullable=False)
    make: Mapped[str | None] = mapped_column(String(100))
    model: Mapped[str | None] = mapped_column(String(100))
    year: Mapped[int | None] = mapped_column(Integer)
    color: Mapped[str | None] = mapped_column(String(50))
    vin: Mapped[str | None] = mapped_column(String(50))
    vehicle_type: Mapped[str] = mapped_column(String(20), server_default="motorcycle")
    # car, motorcycle
    ownership: Mapped[str] = mapped_column(String(20), server_default="company")
    # company, rented
    rental_company: Mapped[str | None] = mapped_column(String(255))
    current_mileage: Mapped[int | None] = mapped_column(Integer)
    fuel_type: Mapped[str | None] = mapped_column(String(20))
    # petrol, diesel, electric, hybrid
    status: Mapped[str] = mapped_column(String(20), server_default="active")
    # active, in_maintenance, decommissioned
    assigned_driver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", use_alter=True)
    )
    insurance_expiry: Mapped[date | None] = mapped_column(Date)
    registration_expiry: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)


class VehicleInspection(Base, TenantMixin):
    __tablename__ = "vehicle_inspections"
    __table_args__ = (
        Index("idx_inspections_vehicle", "vehicle_id", "inspected_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False
    )
    shift_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shifts.id")
    )
    inspected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )
    checklist: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    # { tires: "ok", brakes: "ok", lights: "issue", ... }
    photos: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    # [ { url: "...", label: "front" }, ... ]
    overall_status: Mapped[str] = mapped_column(String(20), server_default="pass")
    # pass, fail, needs_attention
    notes: Mapped[str | None] = mapped_column(Text)
    location_lat: Mapped[float | None] = mapped_column()
    location_lng: Mapped[float | None] = mapped_column()


class MaintenanceRecord(Base, TenantMixin):
    __tablename__ = "maintenance_records"
    __table_args__ = (
        Index("idx_maintenance_vehicle", "vehicle_id", "date"),
        Index("idx_maintenance_tenant_date", "tenant_id", "date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False
    )
    driver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id")
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    # scheduled, unscheduled, emergency, accident
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    # oil_change, brake_service, tire_replacement, engine_repair, battery, ac, body_work, other
    description: Mapped[str | None] = mapped_column(Text)
    cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    vendor: Mapped[str | None] = mapped_column(String(255))
    mileage_at_service: Mapped[int | None] = mapped_column(Integer)
    duration_hours: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    receipt_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), server_default="pending")
    # pending, approved, in_progress, completed, rejected
    source: Mapped[str] = mapped_column(String(20), server_default="manual")
    # agent, manual, system
    # Ticket-based workflow
    spare_vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id", use_alter=True)
    )
    mechanic_dispatched: Mapped[bool | None] = mapped_column()
    police_report_url: Mapped[str | None] = mapped_column(String(500))
    medical_report_url: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )
