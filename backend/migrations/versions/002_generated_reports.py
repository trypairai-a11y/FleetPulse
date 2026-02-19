"""Add generated_reports table for report history

Revision ID: 002_generated_reports
Revises: 001_v2_initial
Create Date: 2026-02-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002_generated_reports"
down_revision: Union[str, None] = "001_v2_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "generated_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("report_type", sa.String(30), nullable=False),
        sa.Column("format", sa.String(10), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("file_size", sa.Integer, nullable=False),
        sa.Column("date_from", sa.Date),
        sa.Column("date_to", sa.Date),
        sa.Column("filters", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_reports_tenant_created", "generated_reports", ["tenant_id", "created_at"])

    # RLS
    op.execute("ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;")
    op.execute("""
        CREATE POLICY tenant_isolation_generated_reports ON generated_reports
        USING (
            CASE
                WHEN COALESCE(current_setting('app.current_tenant_id', true), '') = ''
                THEN false
                ELSE tenant_id = current_setting('app.current_tenant_id', true)::uuid
            END
        );
    """)
    op.execute("""
        CREATE POLICY tenant_insert_generated_reports ON generated_reports
        FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    """)

    # Grant permissions to app role
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON generated_reports TO fleetpulse_app;")


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_generated_reports ON generated_reports;")
    op.execute("DROP POLICY IF EXISTS tenant_insert_generated_reports ON generated_reports;")
    op.execute("ALTER TABLE generated_reports DISABLE ROW LEVEL SECURITY;")
    op.drop_table("generated_reports")
