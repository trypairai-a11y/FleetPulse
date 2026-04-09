-- Add RESTRICTED and RESTRICTED_PERMANENTLY to DriverStatus enum
ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'RESTRICTED';
ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'RESTRICTED_PERMANENTLY';

-- Add OFF and DEDUCTION to AttendanceStatus enum
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'OFF';
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'DEDUCTION';

-- Add RestrictionType enum
DO $$ BEGIN
    CREATE TYPE "RestrictionType" AS ENUM ('TEMPORARY', 'PERMANENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add salary and off-day tracking fields to Driver
ALTER TABLE "Driver"
    ADD COLUMN IF NOT EXISTS "monthlySalary" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "monthlyOffDaysUsed" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "offDaysResetMonth" TEXT;

-- Create DriverRestriction table
CREATE TABLE IF NOT EXISTS "DriverRestriction" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "driverId"    TEXT NOT NULL,
    "type"        "RestrictionType" NOT NULL,
    "startDate"   TIMESTAMP(3) NOT NULL,
    "endDate"     TIMESTAMP(3),
    "reason"      TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverRestriction_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "DriverRestriction"
    ADD CONSTRAINT "DriverRestriction_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "DriverRestriction_driverId_fkey"
        FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "DriverRestriction_tenantId_idx" ON "DriverRestriction"("tenantId");
CREATE INDEX IF NOT EXISTS "DriverRestriction_driverId_idx" ON "DriverRestriction"("driverId");
CREATE INDEX IF NOT EXISTS "DriverRestriction_startDate_idx" ON "DriverRestriction"("startDate");
