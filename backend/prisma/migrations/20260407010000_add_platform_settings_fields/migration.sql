-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN "violationRules" JSONB;
ALTER TABLE "PlatformSettings" ADD COLUMN "cashRules" JSONB;
ALTER TABLE "PlatformSettings" ADD COLUMN "bookingRules" JSONB;
ALTER TABLE "PlatformSettings" ADD COLUMN "documentRules" JSONB;
ALTER TABLE "PlatformSettings" ADD COLUMN "notificationConfig" JSONB;
