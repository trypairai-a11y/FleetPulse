-- R9: Driver performance tier
ALTER TABLE "Driver"
    ADD COLUMN "performanceTier" TEXT,
    ADD COLUMN "tierComputedAt" TIMESTAMP(3);
