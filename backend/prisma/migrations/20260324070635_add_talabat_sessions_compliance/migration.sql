-- CreateEnum
CREATE TYPE "TalabatSessionStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ComplianceEventType" AS ENUM ('SELFIE_FAIL', 'GPS_OFF', 'EQUIPMENT_MISSING', 'SHIFT_NOT_BOOKED', 'ORDER_CLICK_THROUGH', 'LATE_CLOCK_IN', 'EARLY_CLOCK_OUT', 'ZONE_MISMATCH');

-- CreateTable
CREATE TABLE "TalabatSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "shiftId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "zone" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "sessionCode" TEXT NOT NULL,
    "plannedStart" TIMESTAMP(3) NOT NULL,
    "plannedEnd" TIMESTAMP(3) NOT NULL,
    "approvedStart" TIMESTAMP(3),
    "approvedEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "plannedHours" DECIMAL(5,2) NOT NULL,
    "approvedHours" DECIMAL(5,2),
    "actualHours" DECIMAL(5,2),
    "deliveries" INTEGER NOT NULL DEFAULT 0,
    "cashCollected" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "tips" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "distanceKm" DECIMAL(10,3),
    "status" "TalabatSessionStatus" NOT NULL DEFAULT 'PLANNED',
    "faceVerified" BOOLEAN NOT NULL DEFAULT false,
    "equipmentVerified" BOOLEAN NOT NULL DEFAULT false,
    "gpsCompliance" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalabatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalabatComplianceEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "sessionId" TEXT,
    "type" "ComplianceEventType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalabatComplianceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TalabatSession_tenantId_idx" ON "TalabatSession"("tenantId");

-- CreateIndex
CREATE INDEX "TalabatSession_driverId_idx" ON "TalabatSession"("driverId");

-- CreateIndex
CREATE INDEX "TalabatSession_date_idx" ON "TalabatSession"("date");

-- CreateIndex
CREATE INDEX "TalabatSession_zone_date_idx" ON "TalabatSession"("zone", "date");

-- CreateIndex
CREATE INDEX "TalabatComplianceEvent_tenantId_idx" ON "TalabatComplianceEvent"("tenantId");

-- CreateIndex
CREATE INDEX "TalabatComplianceEvent_driverId_idx" ON "TalabatComplianceEvent"("driverId");

-- CreateIndex
CREATE INDEX "TalabatComplianceEvent_type_idx" ON "TalabatComplianceEvent"("type");

-- CreateIndex
CREATE INDEX "TalabatComplianceEvent_createdAt_idx" ON "TalabatComplianceEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "TalabatSession" ADD CONSTRAINT "TalabatSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalabatSession" ADD CONSTRAINT "TalabatSession_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalabatSession" ADD CONSTRAINT "TalabatSession_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalabatComplianceEvent" ADD CONSTRAINT "TalabatComplianceEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalabatComplianceEvent" ADD CONSTRAINT "TalabatComplianceEvent_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalabatComplianceEvent" ADD CONSTRAINT "TalabatComplianceEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TalabatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
