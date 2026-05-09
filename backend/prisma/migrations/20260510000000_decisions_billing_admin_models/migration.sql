-- Phase 2 — Decisions / Billing / Admin schema delta.
--
-- Additive only. Zero destructive operations.
--
-- Hand-crafted because the prior `20260407010000_add_platform_settings_fields`
-- baseline trips Prisma's shadow-DB rebuild (DI-01-02 defect carried over
-- from Phase 1). The same fallback path was used in Phase 1 Wave 4: the SQL
-- here exactly matches what `prisma migrate diff --from-schema-datasource
-- ... --to-schema-datamodel ... --script` produced against the pre-Wave-5
-- schema state, with `IF NOT EXISTS` added for idempotency on re-runs.
--
-- PostgreSQL applies these as metadata-only ops on PG12+ (no full table
-- rewrite) for nullable columns and DEFAULT-ed BOOLEAN columns, so the
-- migration is safe to run on a busy production DB without downtime.

-- AlterTable: Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "designPartner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "monthlyOverrideKd" DECIMAL(10, 3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);

-- AlterTable: User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
