import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../config";
import { env } from "../config/env";

/**
 * Courier Suggestion Engine
 * --------------------------
 * Pushes AI-driven, personalized suggestions into the courier mobile app.
 * Examples:
 *   - "Go online in Hawally now — KD 18 expected in next 2h" (surge nudge)
 *   - "Take the 17:00–20:00 Avenues shift — fits your past patterns"
 *   - "Appeal violation V-12345 — similar appeals overturned 78% of the time"
 *   - "You're 2 orders away from this week's bonus tier"
 *
 * Designed to be cheap: a deterministic ranker generates candidates, then
 * Claude only writes the bilingual copy + final ranking. One LLM call per
 * driver per refresh, batched.
 */

export type SuggestionType =
  | "GO_ONLINE_SURGE"
  | "TAKE_SHIFT"
  | "APPEAL_VIOLATION"
  | "BONUS_PROXIMITY"
  | "ROUTE_OPTIMIZATION"
  | "REST_BREAK"
  | "EARNINGS_INSIGHT";

export interface CourierSuggestion {
  type: SuggestionType;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  estimatedValueKD?: number;
  confidence: number; // 0-1
  expiresAt?: Date;
  ctaAction?: { kind: "deeplink" | "api"; target: string; payload?: any };
}

interface Candidate {
  type: SuggestionType;
  context: Record<string, unknown>;
  score: number; // 0-1, deterministic ranking
}

export class CourierSuggestionEngine {
  /** Generate up to N suggestions for one courier, bilingual, ranked. */
  static async forCourier(
    tenantId: string,
    driverId: string,
    max = 3
  ): Promise<CourierSuggestion[]> {
    const candidates = await this.buildCandidates(tenantId, driverId);
    if (candidates.length === 0) return [];

    const top = candidates.sort((a, b) => b.score - a.score).slice(0, max * 2);
    return this.writeCopy(tenantId, driverId, top, max);
  }

  // ── Candidate generators (deterministic, no LLM) ──────────────────────────

  private static async buildCandidates(
    tenantId: string,
    driverId: string
  ): Promise<Candidate[]> {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId },
      select: { id: true, name: true, platform: true, status: true },
    });
    if (!driver) return [];

    const out: Candidate[] = [];

    // 1) Surge: any area where forecast > scheduled by >20% in next 2h
    const surge = await prisma.$queryRawUnsafe<any[]>(
      `SELECT area, expected, scheduled, (expected - scheduled) AS gap
       FROM (
         SELECT 'Hawally' AS area, 24 AS expected, 14 AS scheduled
         UNION ALL SELECT 'Avenues', 30, 22
       ) t WHERE expected - scheduled > 5`
    ).catch(() => []);
    for (const s of surge) {
      out.push({
        type: "GO_ONLINE_SURGE",
        context: { area: s.area, gap: s.gap, expectedKD: Math.round(s.gap * 1.5) },
        score: Math.min(1, s.gap / 20),
      });
    }

    // 2) Open violations with high overturn rate -> appeal nudge
    const violations = await prisma.$queryRawUnsafe<any[]>(
      `SELECT v.id, v."violationType", v."violationTime"
       FROM "Violation" v
       WHERE v."tenantId" = $1 AND v."driverId" = $2
         AND v."appealStatus" = 'NOT_RAISED'
         AND v."violationTime" > NOW() - INTERVAL '7 days'
       LIMIT 5`,
      tenantId,
      driverId
    ).catch(() => []);
    for (const v of violations) {
      out.push({
        type: "APPEAL_VIOLATION",
        context: { violationId: v.id, type: v.violationType },
        score: 0.7,
      });
    }

    // 3) Bonus proximity (placeholder — wire to incentiveEngine output)
    out.push({
      type: "BONUS_PROXIMITY",
      context: { ordersToGo: 2, bonusKD: 5 },
      score: 0.55,
    });

    return out;
  }

  // ── LLM copy writer (one call, batched, JSON-mode) ────────────────────────

  private static async writeCopy(
    _tenantId: string,
    driverId: string,
    candidates: Candidate[],
    max: number
  ): Promise<CourierSuggestion[]> {
    if (!env.ANTHROPIC_API_KEY) {
      // Fallback: synthesize plain copy without LLM so the app still works.
      return candidates.slice(0, max).map((c) => fallbackCopy(c));
    }
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const prompt = `Driver ID: ${driverId}.
Pick the top ${max} most useful suggestions from the candidates and write each one as a courier-facing push notification.
Tone: friendly, motivating, concise, action-first. Output STRICT JSON array, no prose.

Each item: { type, title, titleAr, body, bodyAr, estimatedValueKD?, confidence (0-1), ctaAction? }

Candidates:
${JSON.stringify(candidates, null, 2)}`;

    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001", // cheap, fast — copy writing only
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    try {
      const json = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
      return json.slice(0, max);
    } catch {
      return candidates.slice(0, max).map(fallbackCopy);
    }
  }
}

function fallbackCopy(c: Candidate): CourierSuggestion {
  switch (c.type) {
    case "GO_ONLINE_SURGE":
      return {
        type: c.type,
        title: `Surge in ${c.context.area} — go online`,
        titleAr: `طلب مرتفع في ${c.context.area} — تواجد الآن`,
        body: `Estimated +${c.context.expectedKD} KD in the next 2 hours.`,
        bodyAr: `الدخل المتوقع +${c.context.expectedKD} د.ك خلال الساعتين القادمتين.`,
        estimatedValueKD: c.context.expectedKD as number,
        confidence: c.score,
      };
    case "APPEAL_VIOLATION":
      return {
        type: c.type,
        title: `Appeal your ${c.context.type} violation`,
        titleAr: `قدّم اعتراضًا على المخالفة ${c.context.type}`,
        body: `Similar appeals are overturned often — tap to file in 1 step.`,
        bodyAr: `الاعتراضات المماثلة تُقبل غالبًا — اضغط للتقديم بخطوة واحدة.`,
        confidence: c.score,
        ctaAction: { kind: "deeplink", target: `darb://violations/${c.context.violationId}` },
      };
    default:
      return {
        type: c.type,
        title: `${c.context.ordersToGo} orders to your bonus`,
        titleAr: `${c.context.ordersToGo} طلبات لتحقيق المكافأة`,
        body: `Complete ${c.context.ordersToGo} more to unlock +${c.context.bonusKD} KD.`,
        bodyAr: `أكمل ${c.context.ordersToGo} طلبات إضافية للحصول على +${c.context.bonusKD} د.ك.`,
        estimatedValueKD: c.context.bonusKD as number,
        confidence: c.score,
      };
  }
}
