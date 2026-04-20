-- CreateTable
CREATE TABLE "AgentRunLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,
    "actionsProposed" INTEGER NOT NULL DEFAULT 0,
    "actionsApproved" INTEGER NOT NULL DEFAULT 0,
    "actionsRejected" INTEGER NOT NULL DEFAULT 0,
    "feedback" JSONB,

    CONSTRAINT "AgentRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentToolCall" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "approvedBy" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingAgentAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "recommendation" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasoning" TEXT NOT NULL,
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "overrideReason" TEXT,
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingAgentAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRunLog_tenantId_agentId_startedAt_idx" ON "AgentRunLog"("tenantId", "agentId", "startedAt");

-- CreateIndex
CREATE INDEX "AgentRunLog_tenantId_status_idx" ON "AgentRunLog"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AgentToolCall_runId_idx" ON "AgentToolCall"("runId");

-- CreateIndex
CREATE INDEX "AgentToolCall_toolName_executedAt_idx" ON "AgentToolCall"("toolName", "executedAt");

-- CreateIndex
CREATE INDEX "PendingAgentAction_tenantId_resolvedAt_priorityScore_idx" ON "PendingAgentAction"("tenantId", "resolvedAt", "priorityScore");

-- CreateIndex
CREATE INDEX "PendingAgentAction_tenantId_agentId_resolvedAt_idx" ON "PendingAgentAction"("tenantId", "agentId", "resolvedAt");

-- CreateIndex
CREATE INDEX "PendingAgentAction_subjectType_subjectId_idx" ON "PendingAgentAction"("subjectType", "subjectId");

-- AddForeignKey
ALTER TABLE "AgentRunLog" ADD CONSTRAINT "AgentRunLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentToolCall" ADD CONSTRAINT "AgentToolCall_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRunLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAgentAction" ADD CONSTRAINT "PendingAgentAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAgentAction" ADD CONSTRAINT "PendingAgentAction_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRunLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
