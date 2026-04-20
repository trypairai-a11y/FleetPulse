-- Restore AiInsight table (dropped in 20260415020000_drop_ai_insight which was reverted).
CREATE TABLE IF NOT EXISTS "AiInsight" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionLabel" TEXT,
    "actionHref" TEXT,
    "data" JSONB,
    "driverId" TEXT,
    "platform" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiInsight_tenantId_context_expiresAt_idx" ON "AiInsight"("tenantId", "context", "expiresAt");
CREATE INDEX IF NOT EXISTS "AiInsight_tenantId_category_idx" ON "AiInsight"("tenantId", "category");
CREATE INDEX IF NOT EXISTS "AiInsight_tenantId_driverId_idx" ON "AiInsight"("tenantId", "driverId");

ALTER TABLE "AiInsight"
  ADD CONSTRAINT "AiInsight_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AiInsight"
  ADD CONSTRAINT "AiInsight_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
