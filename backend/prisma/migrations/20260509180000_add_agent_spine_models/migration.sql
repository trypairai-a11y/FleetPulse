-- Phase 1 Wave 4 — Agent Spine data architecture (5 new tables)
-- ===========================================================
-- Purely additive migration. Creates the 5 net-new agent-spine models
-- introduced in Wave 1 of phase 01-backend-agent-spine-data-architecture:
--   - AgentAction         REQ-data-agent-action (canonical audit ledger)
--   - AgentMemory         REQ-data-agent-memory (append-only key/value)
--   - PinnedView          REQ-data-pinned-view (per-user saved views)
--   - PerformanceSnapshot REQ-data-performance-snapshot (daily score snapshot)
--   - MetricEvent         REQ-data-metric-event (in-product analytics)
--
-- All operations use IF NOT EXISTS / DO $$ idempotency guards so the
-- migration is safe to re-run on dev DBs that received the schema via
-- `prisma db push` during Wave 4 execution. Production deploy via
-- `prisma migrate deploy` will create the tables fresh.
--
-- Zero destructive operations: no DROP TABLE, no ALTER ... DROP COLUMN.

-- ─── AgentAction ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AgentAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposer" TEXT NOT NULL DEFAULT 'Darb',
    "approverId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "originalProposal" JSONB NOT NULL,
    "modificationsBeforeApproval" JSONB,
    "outcome" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "agentRunId" TEXT,
    "modelName" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackById" TEXT,
    "rollbackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgentAction_tenantId_createdAt_idx" ON "AgentAction"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AgentAction_tenantId_toolName_createdAt_idx" ON "AgentAction"("tenantId", "toolName", "createdAt");
CREATE INDEX IF NOT EXISTS "AgentAction_tenantId_subjectType_subjectId_idx" ON "AgentAction"("tenantId", "subjectType", "subjectId");
CREATE INDEX IF NOT EXISTS "AgentAction_approverId_idx" ON "AgentAction"("approverId");

DO $$ BEGIN
    ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRunLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── AgentMemory ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AgentMemory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "source" TEXT,
    "agentRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgentMemory_tenantId_key_createdAt_idx" ON "AgentMemory"("tenantId", "key", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AgentMemory_tenantId_createdAt_idx" ON "AgentMemory"("tenantId", "createdAt");

DO $$ BEGIN
    ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRunLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── PinnedView ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PinnedView" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "viewType" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PinnedView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PinnedView_tenantId_userId_sortOrder_idx" ON "PinnedView"("tenantId", "userId", "sortOrder");
CREATE INDEX IF NOT EXISTS "PinnedView_userId_pinnedAt_idx" ON "PinnedView"("userId", "pinnedAt");

DO $$ BEGIN
    ALTER TABLE "PinnedView" ADD CONSTRAINT "PinnedView_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "PinnedView" ADD CONSTRAINT "PinnedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── PerformanceSnapshot ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "compositeScore" INTEGER NOT NULL,
    "attendanceScore" INTEGER NOT NULL,
    "deliveryScore" INTEGER NOT NULL,
    "financialScore" INTEGER NOT NULL,
    "equipmentScore" INTEGER NOT NULL,
    "platformScore" INTEGER NOT NULL,
    "trend" "ScoreTrend" NOT NULL DEFAULT 'STABLE',
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "shiftsCount" INTEGER NOT NULL DEFAULT 0,
    "violationsCount" INTEGER NOT NULL DEFAULT 0,
    "cashOutstandingKd" DECIMAL(10,3),
    "breakdown" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PerformanceSnapshot_tenantId_snapshotDate_idx" ON "PerformanceSnapshot"("tenantId", "snapshotDate");
CREATE INDEX IF NOT EXISTS "PerformanceSnapshot_driverId_snapshotDate_idx" ON "PerformanceSnapshot"("driverId", "snapshotDate");
CREATE UNIQUE INDEX IF NOT EXISTS "PerformanceSnapshot_tenantId_driverId_snapshotDate_key" ON "PerformanceSnapshot"("tenantId", "driverId", "snapshotDate");

DO $$ BEGIN
    ALTER TABLE "PerformanceSnapshot" ADD CONSTRAINT "PerformanceSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "PerformanceSnapshot" ADD CONSTRAINT "PerformanceSnapshot_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── MetricEvent ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "MetricEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "properties" JSONB,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MetricEvent_tenantId_event_createdAt_idx" ON "MetricEvent"("tenantId", "event", "createdAt");
CREATE INDEX IF NOT EXISTS "MetricEvent_tenantId_createdAt_idx" ON "MetricEvent"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "MetricEvent_userId_createdAt_idx" ON "MetricEvent"("userId", "createdAt");

DO $$ BEGIN
    ALTER TABLE "MetricEvent" ADD CONSTRAINT "MetricEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "MetricEvent" ADD CONSTRAINT "MetricEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
