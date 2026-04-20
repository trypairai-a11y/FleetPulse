-- Add appealLevel to Appeal
ALTER TABLE "Appeal" ADD COLUMN "appealLevel" INTEGER NOT NULL DEFAULT 1;

-- Two-level appeal tracking on Violation
ALTER TABLE "Violation" ADD COLUMN "firstAppealStatus" "AppealStatus" NOT NULL DEFAULT 'NOT_RAISED';
ALTER TABLE "Violation" ADD COLUMN "secondAppealStatus" "AppealStatus" NOT NULL DEFAULT 'NOT_RAISED';

-- Backfill from existing appealStatus and appeals
UPDATE "Violation" SET "firstAppealStatus" = "appealStatus" WHERE "appealStatus" <> 'NOT_RAISED';

CREATE UNIQUE INDEX "Appeal_violationId_appealLevel_key" ON "Appeal"("violationId", "appealLevel");
