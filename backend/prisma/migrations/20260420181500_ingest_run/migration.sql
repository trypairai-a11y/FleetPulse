-- R6: IngestRun audit trail for scheduled/OCR ingestion jobs
CREATE TABLE "IngestRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "rowsIn" INTEGER,
    "rowsOk" INTEGER,
    "errorLog" TEXT,

    CONSTRAINT "IngestRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IngestRun_tenantId_platform_startedAt_idx"
    ON "IngestRun"("tenantId", "platform", "startedAt");

ALTER TABLE "IngestRun"
    ADD CONSTRAINT "IngestRun_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
