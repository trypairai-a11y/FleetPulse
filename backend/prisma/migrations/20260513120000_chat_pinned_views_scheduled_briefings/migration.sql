-- Phase 4 Wave 5 — Chat surface + Pinned Views extensions + Scheduled briefings.
--
-- REQ-chat-global-access + REQ-chat-generated-dashboards + REQ-chat-scheduled-jobs.
--
-- Additive only. Zero destructive operations:
--   - 3 new tables (ChatThread, ChatMessage, ScheduledBriefing)
--   - 2 new columns on AgentAction (source, chatThreadId, chatMessageId — + index)
--   - 3 new columns on PinnedView (refreshFrequency, sourceThreadId, sourceMessageId)
--   - 1 tsvector GIN index on ChatMessage.content (FTS for per-user history search)
--
-- Hand-crafted because the prior `20260407010000_add_platform_settings_fields`
-- baseline trips Prisma's shadow-DB rebuild (DI-01-02 defect; documented in
-- Phase 1 Wave 4 SUMMARY + Phase 2 SUMMARY). The same fallback path used in
-- Phase 1+2+3: db push to apply schema, hand-craft migration SQL with
-- IF NOT EXISTS idempotency guards, then migrate resolve --applied to mark
-- it. PostgreSQL applies ALTER TABLE ADD COLUMN (nullable/DEFAULT) as
-- metadata-only ops on PG12+ so the migration is safe to run on a busy
-- production DB without downtime.

-- ─── PinnedView additions (Phase 4 Wave 1 extensions) ───
ALTER TABLE "PinnedView"
  ADD COLUMN IF NOT EXISTS "refreshFrequency" TEXT NOT NULL DEFAULT 'on_open',
  ADD COLUMN IF NOT EXISTS "sourceThreadId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceMessageId" TEXT;

-- ─── AgentAction additions (chat source link) ───
ALTER TABLE "AgentAction"
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'decisions',
  ADD COLUMN IF NOT EXISTS "chatThreadId" TEXT,
  ADD COLUMN IF NOT EXISTS "chatMessageId" TEXT;

CREATE INDEX IF NOT EXISTS "AgentAction_tenantId_source_createdAt_idx"
  ON "AgentAction"("tenantId", "source", "createdAt");

-- ─── ChatThread ───
CREATE TABLE IF NOT EXISTS "ChatThread" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'user',
    "briefingId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChatThread_tenantId_userId_lastMessageAt_idx"
  ON "ChatThread"("tenantId", "userId", "lastMessageAt" DESC);
CREATE INDEX IF NOT EXISTS "ChatThread_userId_pinned_lastMessageAt_idx"
  ON "ChatThread"("userId", "pinned", "lastMessageAt" DESC);
CREATE INDEX IF NOT EXISTS "ChatThread_tenantId_archivedAt_idx"
  ON "ChatThread"("tenantId", "archivedAt");

-- ─── ChatMessage ───
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "views" JSONB NOT NULL DEFAULT '[]',
    "toolCalls" JSONB NOT NULL DEFAULT '[]',
    "proposalId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'complete',
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "modelName" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChatMessage_threadId_createdAt_idx"
  ON "ChatMessage"("threadId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_tenantId_createdAt_idx"
  ON "ChatMessage"("tenantId", "createdAt");

-- ─── ScheduledBriefing ───
CREATE TABLE IF NOT EXISTS "ScheduledBriefing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "recipients" JSONB NOT NULL DEFAULT '[]',
    "channels" JSONB NOT NULL DEFAULT '["in_chat"]',
    "type" TEXT NOT NULL DEFAULT 'briefing',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nextFireAt" TIMESTAMP(3),
    "lastFireAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledBriefing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScheduledBriefing_tenantId_active_nextFireAt_idx"
  ON "ScheduledBriefing"("tenantId", "active", "nextFireAt");
CREATE INDEX IF NOT EXISTS "ScheduledBriefing_userId_active_idx"
  ON "ScheduledBriefing"("userId", "active");

-- ─── Foreign keys (wrapped in DO blocks so re-runs after db push are safe) ───
DO $$ BEGIN
    ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_briefingId_fkey"
      FOREIGN KEY ("briefingId") REFERENCES "ScheduledBriefing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey"
      FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_proposalId_fkey"
      FOREIGN KEY ("proposalId") REFERENCES "AgentAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "ScheduledBriefing" ADD CONSTRAINT "ScheduledBriefing_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "ScheduledBriefing" ADD CONSTRAINT "ScheduledBriefing_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── FTS GIN index on ChatMessage.content (RESEARCH §"Per-User Searchable Chat History") ───
-- One raw-SQL exception per CLAUDE.md — generated tsvector columns are not yet
-- modelled by Prisma's schema language. 'simple' config preserves Arabic +
-- English keyword recall (RESEARCH Pitfall 5).
ALTER TABLE "ChatMessage"
  ADD COLUMN IF NOT EXISTS "contentTsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', "content")) STORED;

CREATE INDEX IF NOT EXISTS "ChatMessage_contentTsv_idx"
  ON "ChatMessage" USING GIN ("contentTsv");
