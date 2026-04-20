-- R1: TalabatDailyMetrics — per-driver daily KPIs sourced from OCR ingestion / manual upload / portal API
CREATE TABLE "TalabatDailyMetrics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "utr" DOUBLE PRECISION,
    "ordersCompleted" INTEGER,
    "onlineHours" DOUBLE PRECISION,
    "earnings" DOUBLE PRECISION,
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

    CONSTRAINT "TalabatDailyMetrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TalabatDailyMetrics_tenantId_driverId_shiftDate_key"
    ON "TalabatDailyMetrics"("tenantId", "driverId", "shiftDate");

CREATE INDEX "TalabatDailyMetrics_tenantId_shiftDate_idx"
    ON "TalabatDailyMetrics"("tenantId", "shiftDate");

CREATE INDEX "TalabatDailyMetrics_tenantId_status_idx"
    ON "TalabatDailyMetrics"("tenantId", "status");

CREATE INDEX "TalabatDailyMetrics_driverId_shiftDate_idx"
    ON "TalabatDailyMetrics"("driverId", "shiftDate");

ALTER TABLE "TalabatDailyMetrics"
    ADD CONSTRAINT "TalabatDailyMetrics_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TalabatDailyMetrics"
    ADD CONSTRAINT "TalabatDailyMetrics_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
