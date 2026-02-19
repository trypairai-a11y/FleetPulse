"""v2 initial schema — complete rebuild

Revision ID: 001_v2_initial
Revises:
Create Date: 2026-02-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_v2_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Tables that need RLS (all tenant-scoped tables)
RLS_TABLES = [
    "users", "drivers", "devices", "device_commands",
    "shift_templates", "shifts", "attendance_records",
    "vehicles", "vehicle_inspections", "maintenance_records",
    "captured_orders", "location_logs", "app_usage_logs",
    "cash_records", "tickets", "ticket_comments",
    "ai_scores", "alerts", "ai_digests", "ai_chat_history",
    "audit_log",
]


def upgrade() -> None:
    # ── Create app role for RLS if it doesn't exist ──
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'fleetpulse_app') THEN
                CREATE ROLE fleetpulse_app WITH LOGIN PASSWORD 'fleetpulse_app_dev';
            END IF;
        END
        $$;
    """)

    # ── tenants ──
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("name_ar", sa.String(255)),
        sa.Column("country", sa.String(3), server_default="KWT"),
        sa.Column("timezone", sa.String(50), server_default="Asia/Kuwait"),
        sa.Column("currency", sa.String(3), server_default="KWD"),
        sa.Column("subscription_plan", sa.String(20), server_default="starter"),
        sa.Column("max_drivers", sa.Integer, server_default="100"),
        sa.Column("settings", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ── users ──
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("name_ar", sa.String(255)),
        sa.Column("role", sa.String(20), nullable=False, server_default="viewer"),
        sa.Column("phone", sa.String(20)),
        sa.Column("language", sa.String(5), server_default="en"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )
    op.create_index("idx_users_tenant", "users", ["tenant_id"])

    # ── drivers (created before vehicles and devices for FK references) ──
    op.create_table(
        "drivers",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("employee_id", sa.String(50)),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("name_ar", sa.String(255)),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("email", sa.String(255)),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("hire_date", sa.Date),
        sa.Column("nationality", sa.String(100)),
        sa.Column("license_number", sa.String(100)),
        sa.Column("license_expiry", sa.Date),
        sa.Column("license_group", sa.String(50)),
        sa.Column("platform", sa.String(50)),
        sa.Column("current_vehicle_id", postgresql.UUID(as_uuid=True)),  # FK added later
        sa.Column("device_id", postgresql.UUID(as_uuid=True)),  # FK added later
        sa.Column("notes", sa.Text),
        sa.Column("photo_url", sa.String(500)),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "phone", name="uq_drivers_tenant_phone"),
    )
    op.create_index("idx_drivers_tenant_status", "drivers", ["tenant_id", "status"])
    op.create_index("idx_drivers_phone", "drivers", ["phone"])
    op.create_index("idx_drivers_tenant_platform", "drivers", ["tenant_id", "platform"])

    # ── devices ──
    op.create_table(
        "devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("device_token", sa.String(255), unique=True, nullable=False),
        sa.Column("device_model", sa.String(100)),
        sa.Column("os_version", sa.String(50)),
        sa.Column("app_version", sa.String(50)),
        sa.Column("phone_number", sa.String(20)),
        sa.Column("imei", sa.String(50)),
        sa.Column("assigned_driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id")),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("battery_level", sa.Integer),
        sa.Column("last_heartbeat_at", sa.DateTime(timezone=True)),
        sa.Column("last_location_lat", sa.Float),
        sa.Column("last_location_lng", sa.Float),
        sa.Column("config", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_devices_tenant_status", "devices", ["tenant_id", "status"])

    # ── Add deferred FK: drivers -> devices (devices table now exists) ──
    op.create_foreign_key("fk_drivers_device", "drivers", "devices", ["device_id"], ["id"], use_alter=True)

    # ── vehicles ──
    op.create_table(
        "vehicles",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("plate_number", sa.String(50), nullable=False),
        sa.Column("make", sa.String(100)),
        sa.Column("model", sa.String(100)),
        sa.Column("year", sa.Integer),
        sa.Column("color", sa.String(50)),
        sa.Column("vin", sa.String(50)),
        sa.Column("vehicle_type", sa.String(20), server_default="motorcycle"),
        sa.Column("ownership", sa.String(20), server_default="company"),
        sa.Column("rental_company", sa.String(255)),
        sa.Column("current_mileage", sa.Integer),
        sa.Column("fuel_type", sa.String(20)),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("assigned_driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id")),
        sa.Column("insurance_expiry", sa.Date),
        sa.Column("registration_expiry", sa.Date),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "plate_number", name="uq_vehicles_tenant_plate"),
    )

    # ── Add deferred FK: drivers -> vehicles (vehicles table now exists) ──
    op.create_foreign_key("fk_drivers_vehicle", "drivers", "vehicles", ["current_vehicle_id"], ["id"], use_alter=True)

    # ── shift_templates ──
    op.create_table(
        "shift_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("name_ar", sa.String(100)),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("end_time", sa.Time, nullable=False),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ── shifts ──
    op.create_table(
        "shifts",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id"), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("shift_templates.id")),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheduled_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actual_start", sa.DateTime(timezone=True)),
        sa.Column("actual_end", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(20), server_default="scheduled"),
        sa.Column("clock_in_method", sa.String(20)),
        sa.Column("clock_out_method", sa.String(20)),
        sa.Column("clock_in_selfie_url", sa.String(500)),
        sa.Column("clock_in_location_lat", sa.Float),
        sa.Column("clock_in_location_lng", sa.Float),
        sa.Column("clock_out_location_lat", sa.Float),
        sa.Column("clock_out_location_lng", sa.Float),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "driver_id", "date", "scheduled_start", name="uq_shifts_tenant_driver_date_start"),
    )
    op.create_index("idx_shifts_tenant_date", "shifts", ["tenant_id", "date"])
    op.create_index("idx_shifts_driver_date", "shifts", ["driver_id", "date"])
    op.create_index("idx_shifts_status", "shifts", ["tenant_id", "status", "date"])

    # ── attendance_records ──
    op.create_table(
        "attendance_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id"), nullable=False),
        sa.Column("shift_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("shifts.id")),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("scheduled_start", sa.DateTime(timezone=True)),
        sa.Column("actual_start", sa.DateTime(timezone=True)),
        sa.Column("late_minutes", sa.Integer, server_default="0"),
        sa.Column("source", sa.String(20), server_default="manual"),
        sa.Column("selfie_url", sa.String(500)),
        sa.Column("location_lat", sa.Float),
        sa.Column("location_lng", sa.Float),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "driver_id", "date", "shift_id", name="uq_attendance_tenant_driver_date_shift"),
    )
    op.create_index("idx_attendance_tenant_date", "attendance_records", ["tenant_id", "date"])
    op.create_index("idx_attendance_driver", "attendance_records", ["driver_id", "date"])

    # ── vehicle_inspections ──
    op.create_table(
        "vehicle_inspections",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id"), nullable=False),
        sa.Column("shift_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("shifts.id")),
        sa.Column("inspected_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("checklist", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("photos", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("overall_status", sa.String(20), server_default="pass"),
        sa.Column("notes", sa.Text),
        sa.Column("location_lat", sa.Float),
        sa.Column("location_lng", sa.Float),
    )
    op.create_index("idx_inspections_vehicle", "vehicle_inspections", ["vehicle_id", "inspected_at"])

    # ── maintenance_records ──
    op.create_table(
        "maintenance_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id")),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("cost", sa.Numeric(10, 3)),
        sa.Column("vendor", sa.String(255)),
        sa.Column("mileage_at_service", sa.Integer),
        sa.Column("duration_hours", sa.Numeric(5, 2)),
        sa.Column("receipt_url", sa.String(500)),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("source", sa.String(20), server_default="manual"),
        sa.Column("spare_vehicle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id")),
        sa.Column("mechanic_dispatched", sa.Boolean),
        sa.Column("police_report_url", sa.String(500)),
        sa.Column("medical_report_url", sa.String(500)),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_maintenance_vehicle", "maintenance_records", ["vehicle_id", "date"])
    op.create_index("idx_maintenance_tenant_date", "maintenance_records", ["tenant_id", "date"])

    # ── captured_orders ──
    op.create_table(
        "captured_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id"), nullable=False),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("devices.id")),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("order_ref", sa.String(100)),
        sa.Column("status", sa.String(30), server_default="captured"),
        sa.Column("raw_notification", postgresql.JSONB),
        sa.Column("parsed_data", postgresql.JSONB),
        sa.Column("amount", sa.Numeric(10, 3)),
        sa.Column("captured_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_captured_orders_tenant_captured", "captured_orders", ["tenant_id", "captured_at"])
    op.create_index("idx_captured_orders_driver", "captured_orders", ["driver_id", "captured_at"])
    op.create_index("idx_captured_orders_platform", "captured_orders", ["tenant_id", "platform"])

    # ── location_logs ──
    op.create_table(
        "location_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id"), nullable=False),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("devices.id")),
        sa.Column("latitude", sa.Float, nullable=False),
        sa.Column("longitude", sa.Float, nullable=False),
        sa.Column("accuracy", sa.Float),
        sa.Column("speed", sa.Float),
        sa.Column("bearing", sa.Float),
        sa.Column("altitude", sa.Float),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_location_driver_time", "location_logs", ["driver_id", "recorded_at"])
    op.create_index("idx_location_tenant_time", "location_logs", ["tenant_id", "recorded_at"])

    # ── app_usage_logs ──
    op.create_table(
        "app_usage_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id"), nullable=False),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("devices.id")),
        sa.Column("app_package", sa.String(255), nullable=False),
        sa.Column("app_name", sa.String(255)),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("duration_seconds", sa.Integer),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_app_usage_driver", "app_usage_logs", ["driver_id", "recorded_at"])

    # ── cash_records ──
    op.create_table(
        "cash_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("record_type", sa.String(20), nullable=False),
        sa.Column("amount", sa.Numeric(10, 3), nullable=False),
        sa.Column("receipt_url", sa.String(500)),
        sa.Column("deposit_location", sa.String(255)),
        sa.Column("reference_number", sa.String(100)),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("verified_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_cash_tenant_date", "cash_records", ["tenant_id", "date"])
    op.create_index("idx_cash_driver", "cash_records", ["driver_id", "date"])

    # ── tickets ──
    op.create_table(
        "tickets",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("title_ar", sa.String(255)),
        sa.Column("description", sa.Text),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("priority", sa.String(10), server_default="medium"),
        sa.Column("status", sa.String(20), server_default="open"),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id")),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id")),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("data", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_tickets_tenant_status", "tickets", ["tenant_id", "status"])
    op.create_index("idx_tickets_driver", "tickets", ["driver_id"])
    op.create_index("idx_tickets_category", "tickets", ["tenant_id", "category"])

    # ── ticket_comments ──
    op.create_table(
        "ticket_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("attachments", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_ticket_comments_ticket", "ticket_comments", ["ticket_id", "created_at"])

    # ── ai_scores ──
    op.create_table(
        "ai_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("composite_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("attendance_score", sa.Numeric(5, 2)),
        sa.Column("punctuality_score", sa.Numeric(5, 2)),
        sa.Column("performance_score", sa.Numeric(5, 2)),
        sa.Column("maintenance_score", sa.Numeric(5, 2)),
        sa.Column("score_breakdown", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("trend", sa.String(10)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "driver_id", "date", name="uq_scores_tenant_driver_date"),
    )
    op.create_index("idx_scores_driver", "ai_scores", ["driver_id", "date"])
    op.create_index("idx_scores_tenant_date", "ai_scores", ["tenant_id", "date"])

    # ── alerts ──
    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(10), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("title_ar", sa.String(255)),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("message_ar", sa.Text),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("drivers.id")),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id")),
        sa.Column("data", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("acknowledged_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_alerts_tenant_status", "alerts", ["tenant_id", "status", "created_at"])
    op.create_index("idx_alerts_driver", "alerts", ["driver_id", "created_at"])

    # ── ai_digests ──
    op.create_table(
        "ai_digests",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("content", postgresql.JSONB, nullable=False),
        sa.Column("content_ar", postgresql.JSONB),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "date", name="uq_digests_tenant_date"),
    )

    # ── ai_chat_history ──
    op.create_table(
        "ai_chat_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("role", sa.String(10), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("tool_calls", postgresql.JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_chat_tenant_user", "ai_chat_history", ["tenant_id", "user_id", "created_at"])

    # ── device_commands ──
    op.create_table(
        "device_commands",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("devices.id"), nullable=False),
        sa.Column("command_type", sa.String(50), nullable=False),
        sa.Column("payload", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("result", postgresql.JSONB),
        sa.Column("issued_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("idx_device_commands_device_status", "device_commands", ["device_id", "status"])

    # ── audit_log ──
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("changes", postgresql.JSONB),
        sa.Column("ip_address", sa.String(50)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_audit_tenant", "audit_log", ["tenant_id", "created_at"])

    # ── Enable RLS on all tenant-scoped tables ──
    for table in RLS_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"""
            CREATE POLICY tenant_isolation_{table} ON {table}
            USING (
                CASE
                    WHEN COALESCE(current_setting('app.current_tenant_id', true), '') = ''
                    THEN false
                    ELSE tenant_id = current_setting('app.current_tenant_id', true)::uuid
                END
            );
        """)
        op.execute(f"""
            CREATE POLICY tenant_insert_{table} ON {table}
            FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
        """)

    # Special policy: allow SELECT on users without tenant context (for login)
    op.execute("""
        CREATE POLICY users_login_select ON users
        FOR SELECT
        USING (
            CASE
                WHEN COALESCE(current_setting('app.current_tenant_id', true), '') = ''
                THEN true
                ELSE tenant_id = current_setting('app.current_tenant_id', true)::uuid
            END
        );
    """)

    # Allow UPDATE on users when tenant context is set (for last_login_at etc.)
    op.execute("""
        CREATE POLICY users_update ON users
        FOR UPDATE
        USING (
            CASE
                WHEN COALESCE(current_setting('app.current_tenant_id', true), '') = ''
                THEN false
                ELSE tenant_id = current_setting('app.current_tenant_id', true)::uuid
            END
        );
    """)

    # Grant permissions to app role
    for table in RLS_TABLES + ["tenants"]:
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO fleetpulse_app;")


def downgrade() -> None:
    # Drop RLS policies
    for table in RLS_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table};")
        op.execute(f"DROP POLICY IF EXISTS tenant_insert_{table} ON {table};")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

    # Drop tables in reverse dependency order
    tables_to_drop = [
        "audit_log", "device_commands", "ai_chat_history", "ai_digests",
        "alerts", "ai_scores", "ticket_comments", "tickets",
        "cash_records", "app_usage_logs", "location_logs",
        "captured_orders", "maintenance_records", "vehicle_inspections",
        "attendance_records", "shifts", "shift_templates",
        "vehicles", "devices", "drivers", "users", "tenants",
    ]
    for table in tables_to_drop:
        op.drop_table(table)
