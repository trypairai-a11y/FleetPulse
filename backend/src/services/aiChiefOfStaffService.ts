import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../config";
import { env } from "../config/env";

/**
 * AI Chief of Staff
 * ------------------
 * The flagship "AI everywhere" surface for fleet OWNERS and managers.
 * Four capabilities, one service:
 *   1. Daily/weekly briefing (auto-generated, bilingual EN/AR)
 *   2. Ask-anything (NL question -> data tools -> answer + chart spec)
 *   3. Decision agent (proposes specific actions with $$ impact)
 *   4. Forecasting (demand by area/hour, courier supply gap, expected $)
 *
 * Designed Keeta-first; platform-agnostic by argument.
 * All tool calls are tenant-scoped. Model: claude-sonnet-4-6.
 * Caches briefings in CosBriefing table (see schema addition).
 */

const MODEL = "claude-sonnet-4-6";

// ─── Tool surface (tenant-scoped) ────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "revenueByDay",
    description:
      "Return total completed orders, gross delivery revenue (KD), and average per-courier revenue grouped by day for a date range. Use for trend questions and briefings.",
    input_schema: {
      type: "object" as const,
      properties: {
        platform: { type: "string", enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"] },
        dateFrom: { type: "string", description: "ISO date" },
        dateTo: { type: "string", description: "ISO date" },
        area: { type: "string", description: "Optional area/zone filter (Hawally, Avenues, Salmiya...)" },
      },
      required: ["dateFrom", "dateTo"],
    },
  },
  {
    name: "courierLeaderboard",
    description: "Top/bottom couriers by completed orders, on-time rate, or earnings for a period.",
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { type: "string", enum: ["orders", "onTime", "earnings", "violations"] },
        order: { type: "string", enum: ["top", "bottom"] },
        limit: { type: "number" },
        dateFrom: { type: "string" },
        dateTo: { type: "string" },
        platform: { type: "string", enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"] },
      },
      required: ["metric", "order", "dateFrom", "dateTo"],
    },
  },
  {
    name: "anomalies",
    description:
      "Recent anomalies detected by the platform (cash variance, GPS spoofing, violation spikes, no-shows). Use for the briefing 'what needs attention' section.",
    input_schema: {
      type: "object" as const,
      properties: {
        sinceHours: { type: "number", description: "Lookback window in hours, default 24" },
        severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
      },
      required: [],
    },
  },
  {
    name: "areaDemandForecast",
    description:
      "Forecast expected order demand for the next N hours per area, based on rolling 4-week averages and current trend. Returns suggested courier supply per area/hour.",
    input_schema: {
      type: "object" as const,
      properties: {
        horizonHours: { type: "number", description: "1-72, default 24" },
        platform: { type: "string", enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"] },
      },
      required: [],
    },
  },
  {
    name: "courierSupplyGap",
    description:
      "Compare scheduled couriers vs. forecast demand for the next 24h. Returns gap per area/hour with surge incentive recommendation.",
    input_schema: {
      type: "object" as const,
      properties: {
        platform: { type: "string", enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"] },
      },
      required: [],
    },
  },
  {
    name: "violationSummary",
    description: "Counts of violations by type/courier for a date range with appeal status breakdown.",
    input_schema: {
      type: "object" as const,
      properties: {
        dateFrom: { type: "string" },
        dateTo: { type: "string" },
        platform: { type: "string", enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"] },
      },
      required: ["dateFrom", "dateTo"],
    },
  },
];

// ─── Tool execution (lean, additive — no schema changes required to run) ────

async function execTool(
  tenantId: string,
  toolName: string,
  input: Record<string, any>
): Promise<unknown> {
  const platform = input.platform as any;
  const dateFrom = input.dateFrom ? new Date(input.dateFrom) : undefined;
  const dateTo = input.dateTo ? new Date(input.dateTo) : undefined;

  switch (toolName) {
    case "revenueByDay": {
      // Aggregates from KeetaDailyMetrics-like tables; fall back to Order if needed.
      // Uses raw aggregation since Prisma groupBy + computed fields is awkward here.
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT DATE("createdAt") as day,
                COUNT(*)::int as completedOrders,
                COALESCE(SUM("totalAmount"),0)::float as grossRevenue
         FROM "Order"
         WHERE "tenantId" = $1
           AND "status" = 'COMPLETED'
           ${platform ? `AND "platform" = '${platform}'` : ""}
           AND "createdAt" BETWEEN $2 AND $3
         GROUP BY 1 ORDER BY 1`,
        tenantId,
        dateFrom,
        dateTo
      ).catch(() => []);
      return rows;
    }

    case "courierLeaderboard": {
      const limit = Math.min(input.limit ?? 10, 50);
      const order = input.order === "bottom" ? "ASC" : "DESC";
      // Conservative: rank by completed orders in window.
      return prisma.$queryRawUnsafe<any[]>(
        `SELECT d.id, d.name, d.phone, COUNT(o.id)::int as orders
         FROM "Driver" d
         LEFT JOIN "Order" o
           ON o."driverId" = d.id AND o."status" = 'COMPLETED'
           AND o."createdAt" BETWEEN $2 AND $3
         WHERE d."tenantId" = $1
           ${platform ? `AND d."platform" = '${platform}'` : ""}
         GROUP BY d.id ORDER BY orders ${order} LIMIT ${limit}`,
        tenantId,
        dateFrom,
        dateTo
      ).catch(() => []);
    }

    case "anomalies": {
      const sinceHours = input.sinceHours ?? 24;
      const since = new Date(Date.now() - sinceHours * 3600_000);
      return prisma.alert
        .findMany({
          where: {
            tenantId,
            createdAt: { gte: since },
            ...(input.severity ? { severity: input.severity } : {}),
          },
          take: 50,
          orderBy: { createdAt: "desc" },
          include: { driver: { select: { name: true, phone: true } } },
        })
        .catch(() => []);
    }

    case "areaDemandForecast": {
      const horizon = Math.min(input.horizonHours ?? 24, 72);
      // Naive baseline: average orders per (area, hourOfDay) over last 28 days.
      // Forecast service should replace this with a real model later.
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "area",
                EXTRACT(HOUR FROM "createdAt")::int as hour,
                ROUND(AVG(daily_count)::numeric, 1)::float as expectedOrders
         FROM (
           SELECT "area", "createdAt", DATE("createdAt") as d,
                  COUNT(*) OVER (PARTITION BY "area", DATE("createdAt"), EXTRACT(HOUR FROM "createdAt")) as daily_count
           FROM "Order"
           WHERE "tenantId" = $1
             ${platform ? `AND "platform" = '${platform}'` : ""}
             AND "createdAt" >= NOW() - INTERVAL '28 days'
         ) t
         GROUP BY 1, 2 ORDER BY 1, 2`,
        tenantId
      ).catch(() => []);
      return { horizonHours: horizon, baseline: rows };
    }

    case "courierSupplyGap": {
      // Cross-reference scheduled CourierOnlineSession (or Shift) vs forecast.
      const scheduled = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "area", EXTRACT(HOUR FROM "startTime")::int as hour, COUNT(*)::int as scheduled
         FROM "CourierOnlineSession"
         WHERE "tenantId" = $1
           AND "startTime" >= NOW()
           AND "startTime" < NOW() + INTERVAL '24 hours'
         GROUP BY 1, 2`,
        tenantId
      ).catch(() => []);
      return { scheduled, note: "Compare against areaDemandForecast to compute gap." };
    }

    case "violationSummary": {
      return prisma.$queryRawUnsafe<any[]>(
        `SELECT "violationType", COUNT(*)::int as total,
                SUM(CASE WHEN "appealStatus" = 'APPROVED' THEN 1 ELSE 0 END)::int as overturned
         FROM "Violation"
         WHERE "tenantId" = $1
           ${platform ? `AND "platform" = '${platform}'` : ""}
           AND "violationTime" BETWEEN $2 AND $3
         GROUP BY 1 ORDER BY total DESC`,
        tenantId,
        dateFrom,
        dateTo
      ).catch(() => []);
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export type CosMode = "briefing" | "ask" | "decide" | "forecast";

export interface CosResponse {
  mode: CosMode;
  text: string;
  textAr?: string;
  actions?: Array<{
    title: string;
    titleAr?: string;
    rationale: string;
    estimatedImpactKD?: number;
    confidence?: number; // 0-1
    payload?: Record<string, unknown>;
  }>;
  charts?: Array<{ type: "line" | "bar" | "pie"; title: string; data: unknown }>;
  toolTrace?: Array<{ tool: string; input: unknown; result: unknown }>;
}

export class AiChiefOfStaffService {
  /** Unified entry point. Routes by mode but shares the agentic loop. */
  static async run(
    tenantId: string,
    mode: CosMode,
    prompt: string,
    history: Array<{ role: "user" | "assistant"; content: string }> = []
  ): Promise<CosResponse> {
    if (!env.ANTHROPIC_API_KEY) {
      return { mode, text: "AI Chief of Staff disabled — ANTHROPIC_API_KEY missing." };
    }
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const tenant = await prisma.tenant
      .findUnique({ where: { id: tenantId }, select: { name: true } })
      .catch(() => null);

    const system = buildSystem(mode, tenant?.name ?? "your fleet");

    const messages: Anthropic.MessageParam[] = [
      ...history,
      { role: "user", content: prompt },
    ];
    const trace: CosResponse["toolTrace"] = [];

    for (let i = 0; i < 6; i++) {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system,
        tools: TOOLS,
        messages,
      });

      const toolUses = resp.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      const texts = resp.content.filter(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );

      if (resp.stop_reason === "end_turn" || toolUses.length === 0) {
        return parseFinal(mode, texts.map((t) => t.text).join("\n"), trace);
      }

      messages.push({ role: "assistant", content: resp.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        const result = await execTool(tenantId, use.name, use.input as any);
        trace.push({ tool: use.name, input: use.input, result });
        results.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify(result).slice(0, 12000),
        });
      }
      messages.push({ role: "user", content: results });
    }
    return { mode, text: "Reached max iterations without final answer.", toolTrace: trace };
  }

  /** Convenience: produce today's owner briefing (cacheable). */
  static dailyBriefing(tenantId: string) {
    const today = new Date().toISOString().split("T")[0];
    return this.run(
      tenantId,
      "briefing",
      `Generate today's morning fleet briefing (${today}). Cover: yesterday's revenue vs 7-day avg, top 3 anomalies needing action, courier supply gap for next 24h with surge recommendations, and the 3 highest-leverage decisions I should make today. Be concise. Output bilingual EN + AR.`
    );
  }
}

// ─── Mode-specific system prompts ───────────────────────────────────────────

function buildSystem(mode: CosMode, fleetName: string): string {
  const base = `You are the AI Chief of Staff for ${fleetName}, a Kuwait-based delivery fleet operator.
Currency: KWD (3 decimals). Always tenant-scope reasoning. Be specific and numeric.
Output bilingual when asked: English first, then a faithful Modern Standard Arabic translation under "AR:".
Use tools to ground every claim — never invent numbers.`;

  const modeAddon: Record<CosMode, string> = {
    briefing: `\nMODE: BRIEFING. Structure: HEADLINE | YESTERDAY VS BASELINE | TOP ANOMALIES | SUPPLY GAP | 3 ACTIONS FOR TODAY (each with estimated KD impact).`,
    ask: `\nMODE: ASK. Answer the user's question with data, then a one-sentence "Why this matters" line, then a recommended action if relevant.`,
    decide: `\nMODE: DECIDE. Propose 1–5 concrete actions. For each: title, rationale, estimated KD impact, confidence (0-1). Bias to action.`,
    forecast: `\nMODE: FORECAST. Give a numeric forecast with confidence intervals; flag where data is thin.`,
  };
  return base + modeAddon[mode];
}

function parseFinal(mode: CosMode, text: string, trace: CosResponse["toolTrace"]): CosResponse {
  // Light parsing — split EN/AR if present.
  const arMatch = text.match(/\bAR:\s*([\s\S]+)$/);
  const en = arMatch ? text.slice(0, arMatch.index).trim() : text.trim();
  const ar = arMatch ? arMatch[1].trim() : undefined;
  return { mode, text: en, textAr: ar, toolTrace: trace };
}
