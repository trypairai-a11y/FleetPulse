-- CreateTable
CREATE TABLE "KeetaAvailableShiftSlot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "area" TEXT NOT NULL,
    "slotStart" TEXT NOT NULL,
    "slotEnd" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "claimed" INTEGER NOT NULL DEFAULT 0,
    "vehicleType" TEXT,
    "branchId" TEXT,
    "branchName" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeetaAvailableShiftSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KeetaAvailableShiftSlot_tenantId_date_area_slotStart_vehicle_key" ON "KeetaAvailableShiftSlot"("tenantId", "date", "area", "slotStart", "vehicleType");

-- CreateIndex
CREATE INDEX "KeetaAvailableShiftSlot_tenantId_date_idx" ON "KeetaAvailableShiftSlot"("tenantId", "date");

-- CreateIndex
CREATE INDEX "KeetaAvailableShiftSlot_tenantId_area_idx" ON "KeetaAvailableShiftSlot"("tenantId", "area");

-- AddForeignKey
ALTER TABLE "KeetaAvailableShiftSlot" ADD CONSTRAINT "KeetaAvailableShiftSlot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
