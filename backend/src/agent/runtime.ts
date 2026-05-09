import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import type { UserRole } from "../generated/prisma";
import { prisma } from "../config";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { publishEvent, type DarbEvent, type DarbEventType } from "../services/eventBus";
import { toolRegistry, type ToolContext } from "./registry";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentId = "triage" | "reconciliation" | "narrator" | "chat";

export interface AgentDefinition {
  id: AgentId;
  /** Description for logs and the admin UI. */
  description: string;
  /** Event types that trigger this agent, plus "cron" for scheduled runs. */
  triggers: Array<DarbEventType | "cron">;
  /** RBAC role the agent runs under (governs which tools it can call). */
  actorRole: UserRole;
  /** Claude model id. */
  model: string;
  maxTokens: number;
  maxIterations: number;
  /** Path (relative to agent/prompts) for the system prompt. */
  promptFile: string;
}

export interface RunAgentInput {
  tenantId: string;
  triggerEvent: string;
  /** Opaque per-trigger payload included in the first user turn. */
  payload?: Record<string, unknown>;
  /** If set, the conversation opens with this user message (chat mode). */
  userMessage?: string;
  /** Conversation history (chat mode). */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface RunAgentResult {
  runId: string;
  status: "completed" | "failed" | "disabled";
  text?: string;
  actionsProposed: number;
  pendingActionIds: string[];
  error?: string;
}

// ─── Agent registry ──────────────────────────────────────────────────────────

const agents = new Map<AgentId, AgentDefinition>();

export function registerAgent(def: AgentDefinition) {
  agents.set(def.id, def);
}

export function getAgent(id: AgentId): AgentDefinition | undefined {
  return agents.get(id);
}

export function listAgents(): AgentDefinition[] {
  return [...agents.values()];
}

// ─── Prompt loader (read once per process, cached) ───────────────────────────

const promptCache = new Map<string, string>();
function loadPrompt(file: string): string {
  const cached = promptCache.get(file);
  if (cached) return cached;
  const fullPath = path.join(__dirname, "prompts", file);
  try {
    const contents = fs.readFileSync(fullPath, "utf8");
    promptCache.set(file, contents);
    return contents;
  } catch (err) {
    logger.warn({ err, file }, "agentRuntime: prompt file missing, using empty prompt");
    return "";
  }
}

// ─── Runtime ─────────────────────────────────────────────────────────────────

/**
 * Run an agent. Generalised tool-loop lifted from AiChatService.chat —
 * difference: tools come from the shared ToolRegistry (with RBAC, approval
 * gates, and audit), and every run is persisted in AgentRunLog.
 */
export async function runAgent(
  agentId: AgentId,
  input: RunAgentInput
): Promise<RunAgentResult> {
  const agent = agents.get(agentId);
  if (!agent) {
    return {
      runId: "",
      status: "failed",
      actionsProposed: 0,
      pendingActionIds: [],
      error: `Unknown agent: ${agentId}`,
    };
  }

  if (!env.ANTHROPIC_API_KEY) {
    return {
      runId: "",
      status: "disabled",
      text: "Agent runtime disabled: ANTHROPIC_API_KEY not configured.",
      actionsProposed: 0,
      pendingActionIds: [],
    };
  }

  const runLog = await prisma.agentRunLog.create({
    data: {
      tenantId: input.tenantId,
      agentId: agent.id,
      triggerEvent: input.triggerEvent,
      model: agent.model,
    },
  });

  const ctx: ToolContext = {
    tenantId: input.tenantId,
    agentId: agent.id,
    runId: runLog.id,
    actorRole: agent.actorRole,
  };

  const systemPrompt = loadPrompt(agent.promptFile);
  const tools = toolRegistry.getAnthropicSchema(agent.id, agent.actorRole);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // Build initial messages: history + user message + trigger payload
  const initialUserContent = input.userMessage
    ? input.userMessage
    : `Trigger: ${input.triggerEvent}\nPayload: ${JSON.stringify(input.payload ?? {}, null, 2)}\n\nFollow your instructions.`;

  const messages: Anthropic.MessageParam[] = [
    ...(input.history ?? []).map((h) => ({
      role: h.role,
      content: h.content,
    })),
    { role: "user", content: initialUserContent },
  ];

  let promptTokens = 0;
  let completionTokens = 0;
  let actionsProposed = 0;
  const pendingActionIds: string[] = [];
  let finalText = "";

  try {
    for (let i = 0; i < agent.maxIterations; i++) {
      const response = await client.messages.create({
        model: agent.model,
        max_tokens: agent.maxTokens,
        system: systemPrompt,
        tools,
        messages,
      });

      promptTokens += response.usage.input_tokens;
      completionTokens += response.usage.output_tokens;

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );

      if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
        finalText = textBlocks.map((b) => b.text).join("\n").trim();
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        // Agents can pass recommendation metadata on the tool input under the
        // reserved key "_meta" to hint the registry when staging approvals.
        const rawInput = toolUse.input as Record<string, unknown> & {
          _meta?: { recommendation?: string; reasoning?: string; confidence?: number; priorityScore?: number; subjectType?: string; subjectId?: string };
        };
        const { _meta, ...toolInput } = rawInput;

        const result = await toolRegistry.invoke(toolUse.name, ctx, toolInput, _meta ?? {});

        if (result.status === "pending_approval" && result.pendingActionId) {
          actionsProposed++;
          pendingActionIds.push(result.pendingActionId);
          await publishEvent({
            type: "agent_action_pending",
            tenantId: input.tenantId,
            timestamp: new Date().toISOString(),
            payload: { pendingActionId: result.pendingActionId, agentId: agent.id, toolName: toolUse.name },
          } as DarbEvent);
        }

        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
          is_error: result.status === "error" || result.status === "forbidden",
        });
      }

      messages.push({ role: "user", content: toolResultBlocks });
    }

    await prisma.agentRunLog.update({
      where: { id: runLog.id },
      data: {
        finishedAt: new Date(),
        status: "completed",
        promptTokens,
        completionTokens,
        actionsProposed,
      },
    });

    return {
      runId: runLog.id,
      status: "completed",
      text: finalText,
      actionsProposed,
      pendingActionIds,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, agentId, runId: runLog.id }, "agentRuntime: run failed");
    await prisma.agentRunLog.update({
      where: { id: runLog.id },
      data: {
        finishedAt: new Date(),
        status: "failed",
        error: message,
        promptTokens,
        completionTokens,
      },
    });
    return {
      runId: runLog.id,
      status: "failed",
      actionsProposed,
      pendingActionIds,
      error: message,
    };
  }
}
