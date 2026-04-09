-- Rename enum ComplianceEventType -> ViolationEventType (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ComplianceEventType') THEN
    ALTER TYPE "ComplianceEventType" RENAME TO "ViolationEventType";
  END IF;
END $$;

-- Rename enum value COMPLIANCE -> VIOLATION in KpiCategory (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'KpiCategory' AND e.enumlabel = 'COMPLIANCE') THEN
    ALTER TYPE "KpiCategory" RENAME VALUE 'COMPLIANCE' TO 'VIOLATION';
  END IF;
END $$;

-- Rename table TalabatComplianceEvent -> TalabatViolationEvent (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'TalabatComplianceEvent') THEN
    ALTER TABLE "TalabatComplianceEvent" RENAME TO "TalabatViolationEvent";
  END IF;
END $$;

-- Rename column gpsCompliance -> gpsViolation in TalabatSession (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TalabatSession' AND column_name = 'gpsCompliance') THEN
    ALTER TABLE "TalabatSession" RENAME COLUMN "gpsCompliance" TO "gpsViolation";
  END IF;
END $$;

-- Rename indexes (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TalabatComplianceEvent_pkey') THEN
    ALTER INDEX "TalabatComplianceEvent_pkey" RENAME TO "TalabatViolationEvent_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TalabatComplianceEvent_tenantId_idx') THEN
    ALTER INDEX "TalabatComplianceEvent_tenantId_idx" RENAME TO "TalabatViolationEvent_tenantId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TalabatComplianceEvent_driverId_idx') THEN
    ALTER INDEX "TalabatComplianceEvent_driverId_idx" RENAME TO "TalabatViolationEvent_driverId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TalabatComplianceEvent_type_idx') THEN
    ALTER INDEX "TalabatComplianceEvent_type_idx" RENAME TO "TalabatViolationEvent_type_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TalabatComplianceEvent_createdAt_idx') THEN
    ALTER INDEX "TalabatComplianceEvent_createdAt_idx" RENAME TO "TalabatViolationEvent_createdAt_idx";
  END IF;
END $$;

-- Rename foreign key constraints (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'TalabatComplianceEvent_tenantId_fkey') THEN
    ALTER TABLE "TalabatViolationEvent" RENAME CONSTRAINT "TalabatComplianceEvent_tenantId_fkey" TO "TalabatViolationEvent_tenantId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'TalabatComplianceEvent_driverId_fkey') THEN
    ALTER TABLE "TalabatViolationEvent" RENAME CONSTRAINT "TalabatComplianceEvent_driverId_fkey" TO "TalabatViolationEvent_driverId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'TalabatComplianceEvent_sessionId_fkey') THEN
    ALTER TABLE "TalabatViolationEvent" RENAME CONSTRAINT "TalabatComplianceEvent_sessionId_fkey" TO "TalabatViolationEvent_sessionId_fkey";
  END IF;
END $$;
