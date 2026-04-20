-- Add platform column to KeetaAvailableShiftSlot so the same table can hold
-- open slots for Keeta and Talabat (and later Deliveroo/Americana).

-- Drop the old unique index that didn't include platform
DROP INDEX IF EXISTS "KeetaAvailableShiftSlot_tenantId_date_area_slotStart_vehicle_key";

-- Drop the old secondary indexes
DROP INDEX IF EXISTS "KeetaAvailableShiftSlot_tenantId_date_idx";
DROP INDEX IF EXISTS "KeetaAvailableShiftSlot_tenantId_area_idx";

-- Add the platform column. Existing rows are Keeta-only (model was Keeta-specific).
ALTER TABLE "KeetaAvailableShiftSlot"
  ADD COLUMN "platform" "Platform" NOT NULL DEFAULT 'KEETA';

-- Recreate the unique constraint including platform
CREATE UNIQUE INDEX "KeetaAvailableShiftSlot_tenantId_platform_date_area_slotStar_key"
  ON "KeetaAvailableShiftSlot"("tenantId", "platform", "date", "area", "slotStart", "vehicleType");

-- Recreate supporting indexes
CREATE INDEX "KeetaAvailableShiftSlot_tenantId_platform_date_idx"
  ON "KeetaAvailableShiftSlot"("tenantId", "platform", "date");

CREATE INDEX "KeetaAvailableShiftSlot_tenantId_platform_area_idx"
  ON "KeetaAvailableShiftSlot"("tenantId", "platform", "area");
