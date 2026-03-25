import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../config";
import { env } from "../config/env";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  response: string;
  toolResults?: Array<{
    toolName: string;
    input: Record<string, unknown>;
    result: unknown;
  }>;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "queryDrivers",
    description:
      "Query driver records from the database. Returns driver profiles including name, platform, status, zone, and related data.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED"],
          description: "Filter by driver status",
        },
        platform: {
          type: "string",
          enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"],
          description: "Filter by delivery platform",
        },
        name: {
          type: "string",
          description: "Filter by driver name (partial match)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default 20, max 100)",
        },
      },
      required: [],
    },
  },
  {
    name: "queryShifts",
    description:
      "Query shift records. Returns shift details including date, status, planned/actual hours, and driver info.",
    input_schema: {
      type: "object" as const,
      properties: {
        driverId: {
          type: "string",
          description: "Filter by specific driver ID",
        },
        status: {
          type: "string",
          enum: ["BOOKED", "IN_PROGRESS", "COMPLETED", "MISSED", "CANCELLED"],
          description: "Filter by shift status",
        },
        platform: {
          type: "string",
          enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"],
          description: "Filter by platform",
        },
        dateFrom: {
          type: "string",
          description: "Start date filter (ISO 8601, e.g. 2025-01-01)",
        },
        dateTo: {
          type: "string",
          description: "End date filter (ISO 8601, e.g. 2025-01-31)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 20, max 100)",
        },
      },
      required: [],
    },
  },
  {
    name: "queryOrders",
    description:
      "Query order log records. Returns order counts, cash collected, tips, and distance per driver per day.",
    input_schema: {
      type: "object" as const,
      properties: {
        driverId: {
          type: "string",
          description: "Filter by specific driver ID",
        },
        platform: {
          type: "string",
          enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"],
          description: "Filter by delivery platform",
        },
        dateFrom: {
          type: "string",
          description: "Start date filter (ISO 8601)",
        },
        dateTo: {
          type: "string",
          description: "End date filter (ISO 8601)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 20, max 100)",
        },
      },
      required: [],
    },
  },
  {
    name: "queryCash",
    description:
      "Query cash records. Returns sales amounts, collection amounts, pending dues, and deposit status per driver.",
    input_schema: {
      type: "object" as const,
      properties: {
        driverId: {
          type: "string",
          description: "Filter by specific driver ID",
        },
        status: {
          type: "string",
          enum: ["PENDING", "PARTIALLY_PAID", "SETTLED"],
          description: "Filter by cash record status",
        },
        dateFrom: {
          type: "string",
          description: "Start date filter (ISO 8601)",
        },
        dateTo: {
          type: "string",
          description: "End date filter (ISO 8601)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 20, max 100)",
        },
      },
      required: [],
    },
  },
  {
    name: "queryAlerts",
    description:
      "Query alert records. Returns active anomalies, warnings, and critical issues for the fleet.",
    input_schema: {
      type: "object" as const,
      properties: {
        severity: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
          description: "Filter by alert severity",
        },
        status: {
          type: "string",
          enum: ["ACTIVE", "ACKNOWLEDGED", "RESOLVED"],
          description: "Filter by alert status",
        },
        type: {
          type: "string",
          description: "Filter by alert type (e.g. LOW_ORDER_COUNT, CASH_NOT_DEPOSITED)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 20, max 100)",
        },
      },
      required: [],
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

async function executeTool(
  tenantId: string,
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const limit = Math.min(Number(input.limit ?? 20), 100);

  switch (toolName) {
    case "queryDrivers": {
      return prisma.driver.findMany({
        where: {
          tenantId,
          ...(input.status ? { status: input.status as any } : {}),
          ...(input.platform ? { platform: input.platform as any } : {}),
          ...(input.name
            ? { name: { contains: input.name as string, mode: "insensitive" as const } }
            : {}),
        } as any,
        include: {
          company: { select: { name: true, platform: true } },
          aiScores: {
            orderBy: { date: "desc" },
            take: 1,
            select: { compositeScore: true, trend: true, date: true },
          },
        },
        take: limit,
        orderBy: { name: "asc" },
      });
    }

    case "queryShifts": {
      const dateWhere: Record<string, Date> = {};
      if (input.dateFrom) dateWhere.gte = new Date(input.dateFrom as string);
      if (input.dateTo) dateWhere.lte = new Date(input.dateTo as string);

      return prisma.shift.findMany({
        where: {
          tenantId,
          ...(input.driverId ? { driverId: input.driverId as string } : {}),
          ...(input.status ? { status: input.status as any } : {}),
          ...(input.platform ? { platform: input.platform as any } : {}),
          ...(Object.keys(dateWhere).length > 0 ? { date: dateWhere } : {}),
        },
        include: {
          driver: { select: { name: true, platform: true } },
        },
        take: limit,
        orderBy: { date: "desc" },
      });
    }

    case "queryOrders": {
      const dateWhere: Record<string, Date> = {};
      if (input.dateFrom) dateWhere.gte = new Date(input.dateFrom as string);
      if (input.dateTo) dateWhere.lte = new Date(input.dateTo as string);

      return prisma.orderLog.findMany({
        where: {
          tenantId,
          ...(input.driverId ? { driverId: input.driverId as string } : {}),
          ...(input.platform ? { platform: input.platform as any } : {}),
          ...(Object.keys(dateWhere).length > 0 ? { date: dateWhere } : {}),
        },
        include: {
          driver: { select: { name: true } },
        },
        take: limit,
        orderBy: { date: "desc" },
      });
    }

    case "queryCash": {
      const dateWhere: Record<string, Date> = {};
      if (input.dateFrom) dateWhere.gte = new Date(input.dateFrom as string);
      if (input.dateTo) dateWhere.lte = new Date(input.dateTo as string);

      return prisma.cashRecord.findMany({
        where: {
          tenantId,
          ...(input.driverId ? { driverId: input.driverId as string } : {}),
          ...(input.status ? { status: input.status as any } : {}),
          ...(Object.keys(dateWhere).length > 0 ? { date: dateWhere } : {}),
        },
        include: {
          driver: { select: { name: true } },
        },
        take: limit,
        orderBy: { date: "desc" },
      });
    }

    case "queryAlerts": {
      return prisma.alert.findMany({
        where: {
          tenantId,
          ...(input.severity ? { severity: input.severity as any } : {}),
          ...(input.status ? { status: input.status as any } : {}),
          ...(input.type ? { type: input.type as string } : {}),
        },
        include: {
          driver: { select: { name: true } },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      });
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AiChatService {
  /**
   * Handle a chat message with full tool-use support.
   * Claude can query live fleet data to answer questions.
   *
   * @param tenantId  - Tenant scope for all data queries
   * @param message   - Latest user message
   * @param history   - Prior conversation turns (role + content)
   * @returns Final text response and any tool results used
   */
  static async chat(
    tenantId: string,
    message: string,
    history: Array<{ role: string; content: string }>
  ): Promise<ChatResponse> {
    if (!env.ANTHROPIC_API_KEY) {
      return {
        response:
          "AI chat is not available — ANTHROPIC_API_KEY is not configured.",
      };
    }

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    // ── Fetch minimal tenant context for system prompt ─────────────────────
    const tenant = await prisma.tenant
      .findUnique({
        where: { id: tenantId },
        select: { name: true, subscriptionPlan: true },
      })
      .catch(() => null);

    const driverCount = await prisma.driver
      .count({ where: { tenantId, status: "ACTIVE" } })
      .catch(() => 0);

    const systemPrompt = `You are an AI operations assistant for ${tenant?.name ?? "a fleet company"}, a delivery fleet management system in Kuwait.

Company context:
- Tenant: ${tenant?.name ?? "Unknown"}
- Plan: ${tenant?.subscriptionPlan ?? "Unknown"}
- Active drivers: ${driverCount}
- Operating platforms: KEETA, TALABAT, DELIVEROO, AMERICANA
- Currency: Kuwaiti Dinar (KWD), 3 decimal places
- Location: Kuwait

Your role:
- Help operations managers understand fleet performance
- Answer questions about drivers, shifts, orders, cash, and alerts
- Identify trends and issues in the data
- Provide actionable recommendations
- Be concise, data-driven, and professional

You have tools to query live data. Use them when the user asks about specific numbers, drivers, or recent activity. Always use tool data to support your answers rather than making up numbers.

Today's date: ${new Date().toISOString().split("T")[0]}`;

    // ── Build message history for Claude ──────────────────────────────────
    const messages: Anthropic.MessageParam[] = [
      ...history
        .filter((h) => h.role === "user" || h.role === "assistant")
        .map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
      { role: "user" as const, content: message },
    ];

    const collectedToolResults: ChatResponse["toolResults"] = [];

    // ── Agentic loop: keep calling until no more tool use ─────────────────
    let iteration = 0;
    const MAX_ITERATIONS = 5;

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });

      // Check if Claude wants to use tools
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );

      if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
        // Final answer — return the text
        const finalText = textBlocks.map((b) => b.text).join("\n").trim();
        return {
          response: finalText || "I couldn't generate a response. Please try again.",
          toolResults: collectedToolResults.length > 0 ? collectedToolResults : undefined,
        };
      }

      // Add assistant's response (with tool calls) to the conversation
      messages.push({ role: "assistant", content: response.content });

      // Execute each tool call and collect results
      const toolResultContent: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const toolInput = toolUse.input as Record<string, unknown>;

        let toolResult: unknown;
        try {
          toolResult = await executeTool(tenantId, toolUse.name, toolInput);
        } catch (err) {
          console.error(`[AiChatService] Tool ${toolUse.name} error:`, err);
          toolResult = { error: `Tool execution failed: ${String(err)}` };
        }

        collectedToolResults.push({
          toolName: toolUse.name,
          input: toolInput,
          result: toolResult,
        });

        toolResultContent.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Add tool results back into conversation
      messages.push({ role: "user", content: toolResultContent });
    }

    // Exceeded max iterations — return what we have
    return {
      response: "I reached the maximum number of tool calls while processing your request. Please try a more specific question.",
      toolResults: collectedToolResults.length > 0 ? collectedToolResults : undefined,
    };
  }
}
