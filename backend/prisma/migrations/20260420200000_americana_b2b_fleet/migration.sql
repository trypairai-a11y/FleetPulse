-- A1..A9: Americana B2B fleet — chain/store/contract/rate/assignment models,
-- daily IMAP ingestion staging, 3 new violation types, and supervisor-override
-- fields on Violation.

-- 1. New violation types for Americana
ALTER TYPE "ViolationType" ADD VALUE IF NOT EXISTS 'AMERICANA_LATE_ARRIVAL';
ALTER TYPE "ViolationType" ADD VALUE IF NOT EXISTS 'AMERICANA_NO_SHOW';
ALTER TYPE "ViolationType" ADD VALUE IF NOT EXISTS 'AMERICANA_EARLY_DEPARTURE_QUIT';

-- 2. Violation: add override fields (supervisor override, no Appeal flow for Americana)
ALTER TABLE "Violation" ADD COLUMN IF NOT EXISTS "overrideReason" TEXT;
ALTER TABLE "Violation" ADD COLUMN IF NOT EXISTS "overriddenBy" TEXT;
ALTER TABLE "Violation" ADD COLUMN IF NOT EXISTS "overriddenAt" TIMESTAMP(3);

-- 3. AmericanaDailyOrders: add FK chainId + storeId, keep legacy strings
ALTER TABLE "AmericanaDailyOrders" ADD COLUMN IF NOT EXISTS "chainId" TEXT;
ALTER TABLE "AmericanaDailyOrders" ADD COLUMN IF NOT EXISTS "storeId" TEXT;

-- 4. AmericanaChain
CREATE TABLE "AmericanaChain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmericanaChain_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AmericanaChain_tenantId_slug_key" ON "AmericanaChain"("tenantId", "slug");
CREATE INDEX "AmericanaChain_tenantId_active_idx" ON "AmericanaChain"("tenantId", "active");

-- 5. AmericanaStore
CREATE TABLE "AmericanaStore" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT,
    "costCenter" TEXT,
    "managerName" TEXT,
    "managerPhone" TEXT,
    "managerWhatsapp" TEXT,
    "backupContactName" TEXT,
    "backupContactPhone" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmericanaStore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AmericanaStore_tenantId_name_key" ON "AmericanaStore"("tenantId", "name");
CREATE INDEX "AmericanaStore_tenantId_chainId_idx" ON "AmericanaStore"("tenantId", "chainId");
CREATE INDEX "AmericanaStore_tenantId_active_idx" ON "AmericanaStore"("tenantId", "active");

-- 6. AmericanaContract
CREATE TABLE "AmericanaContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractRef" TEXT NOT NULL,
    "signedDate" TIMESTAMP(3) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "originalFileUrl" TEXT NOT NULL,
    "ocrStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "ocrExtractedAt" TIMESTAMP(3),
    "ocrConfidence" DOUBLE PRECISION,
    "ocrDraftRates" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmericanaContract_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AmericanaContract_tenantId_contractRef_key" ON "AmericanaContract"("tenantId", "contractRef");
CREATE INDEX "AmericanaContract_tenantId_effectiveFrom_idx" ON "AmericanaContract"("tenantId", "effectiveFrom");

-- 7. AmericanaChainRate
CREATE TABLE "AmericanaChainRate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "ratePerOrder" DECIMAL(10,3) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "contractId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmericanaChainRate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AmericanaChainRate_tenantId_chainId_vehicleType_effectiveFrom_idx"
    ON "AmericanaChainRate"("tenantId", "chainId", "vehicleType", "effectiveFrom");

-- 8. AmericanaStoreAssignment
CREATE TABLE "AmericanaStoreAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "vehicleType" TEXT NOT NULL,
    "reasonForChange" TEXT,
    "previousAssignmentId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmericanaStoreAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AmericanaStoreAssignment_tenantId_driverId_month_startDate_key"
    ON "AmericanaStoreAssignment"("tenantId", "driverId", "month", "startDate");
CREATE INDEX "AmericanaStoreAssignment_tenantId_storeId_month_idx"
    ON "AmericanaStoreAssignment"("tenantId", "storeId", "month");
CREATE INDEX "AmericanaStoreAssignment_tenantId_driverId_month_idx"
    ON "AmericanaStoreAssignment"("tenantId", "driverId", "month");

-- 9. AmericanaDailyIngestion
CREATE TABLE "AmericanaDailyIngestion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "emailMessageId" TEXT,
    "rawFileUrl" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingestDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "parsedRows" JSONB NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "errorLog" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmericanaDailyIngestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AmericanaDailyIngestion_tenantId_emailMessageId_key"
    ON "AmericanaDailyIngestion"("tenantId", "emailMessageId");
CREATE INDEX "AmericanaDailyIngestion_tenantId_ingestDate_idx"
    ON "AmericanaDailyIngestion"("tenantId", "ingestDate");
CREATE INDEX "AmericanaDailyIngestion_tenantId_status_idx"
    ON "AmericanaDailyIngestion"("tenantId", "status");

-- 10. AmericanaDailyOrders indexes for new FKs
CREATE INDEX "AmericanaDailyOrders_tenantId_chainId_month_idx"
    ON "AmericanaDailyOrders"("tenantId", "chainId", "month");
CREATE INDEX "AmericanaDailyOrders_tenantId_storeId_month_idx"
    ON "AmericanaDailyOrders"("tenantId", "storeId", "month");

-- 11. Foreign keys
ALTER TABLE "AmericanaChain"
    ADD CONSTRAINT "AmericanaChain_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AmericanaStore"
    ADD CONSTRAINT "AmericanaStore_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AmericanaStore"
    ADD CONSTRAINT "AmericanaStore_chainId_fkey"
    FOREIGN KEY ("chainId") REFERENCES "AmericanaChain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AmericanaContract"
    ADD CONSTRAINT "AmericanaContract_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AmericanaChainRate"
    ADD CONSTRAINT "AmericanaChainRate_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AmericanaChainRate"
    ADD CONSTRAINT "AmericanaChainRate_chainId_fkey"
    FOREIGN KEY ("chainId") REFERENCES "AmericanaChain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AmericanaChainRate"
    ADD CONSTRAINT "AmericanaChainRate_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "AmericanaContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AmericanaStoreAssignment"
    ADD CONSTRAINT "AmericanaStoreAssignment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AmericanaStoreAssignment"
    ADD CONSTRAINT "AmericanaStoreAssignment_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AmericanaStoreAssignment"
    ADD CONSTRAINT "AmericanaStoreAssignment_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "AmericanaStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AmericanaDailyIngestion"
    ADD CONSTRAINT "AmericanaDailyIngestion_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AmericanaDailyOrders"
    ADD CONSTRAINT "AmericanaDailyOrders_chainId_fkey"
    FOREIGN KEY ("chainId") REFERENCES "AmericanaChain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AmericanaDailyOrders"
    ADD CONSTRAINT "AmericanaDailyOrders_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "AmericanaStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
