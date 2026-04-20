-- D1 + D3: DeliverooDailyMetrics model, DELIVEROO_UNASSIGNED_ORDER enum value,
-- and a nullable driverId on Violation so platform-level (driverless) violations
-- can be recorded.

-- 1. Add DELIVEROO_UNASSIGNED_ORDER to ViolationType enum.
ALTER TYPE "ViolationType" ADD VALUE IF NOT EXISTS 'DELIVEROO_UNASSIGNED_ORDER';

-- 2. Loosen Violation.driverId — make it nullable and set its FK ON DELETE to SET NULL
--    so deleting a driver doesn't erase the historical platform-fault record.
ALTER TABLE "Violation" DROP CONSTRAINT IF EXISTS "Violation_driverId_fkey";
ALTER TABLE "Violation" ALTER COLUMN "driverId" DROP NOT NULL;
ALTER TABLE "Violation"
    ADD CONSTRAINT "Violation_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. DeliverooDailyMetrics — rider daily totals from Deliveroo "My deliveries" OCR.
CREATE TABLE "DeliverooDailyMetrics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "codCollectedKwd" DECIMAL(10,3) NOT NULL,
    "tipsKwd" DECIMAL(10,3) NOT NULL,
    "deliveriesCount" INTEGER NOT NULL,
    "unassignedCount" INTEGER NOT NULL DEFAULT 0,
    "hourlyBuckets" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PARSED',
    "rawImageUrl" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "ocrRaw" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverooDailyMetrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliverooDailyMetrics_tenantId_driverId_shiftDate_key"
    ON "DeliverooDailyMetrics"("tenantId", "driverId", "shiftDate");

CREATE INDEX "DeliverooDailyMetrics_tenantId_shiftDate_idx"
    ON "DeliverooDailyMetrics"("tenantId", "shiftDate");

CREATE INDEX "DeliverooDailyMetrics_tenantId_status_idx"
    ON "DeliverooDailyMetrics"("tenantId", "status");

CREATE INDEX "DeliverooDailyMetrics_driverId_shiftDate_idx"
    ON "DeliverooDailyMetrics"("driverId", "shiftDate");

ALTER TABLE "DeliverooDailyMetrics"
    ADD CONSTRAINT "DeliverooDailyMetrics_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DeliverooDailyMetrics"
    ADD CONSTRAINT "DeliverooDailyMetrics_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
