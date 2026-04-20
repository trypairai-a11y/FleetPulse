-- DS13: No WhatsApp integration in v1. Drop the AmericanaStore.managerWhatsapp
-- column. Safe to re-run (uses IF EXISTS) and safe against fresh databases that
-- never had the column.
ALTER TABLE "AmericanaStore" DROP COLUMN IF EXISTS "managerWhatsapp";
